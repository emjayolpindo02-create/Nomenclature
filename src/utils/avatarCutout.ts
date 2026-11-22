export function stripOuterCheckerboard(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  if (width <= 0 || height <= 0 || data.length < width * height * 4) return;

  const total = width * height;
  const visited = new Uint8Array(total);
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isNeutralBackgroundPixel = (idx: number): boolean => {
    const offset = idx * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    if (a < 10) return true;
    const maxCh = r > g ? (r > b ? r : b) : g > b ? g : b;
    const minCh = r < g ? (r < b ? r : b) : g < b ? g : b;
    const chroma = maxCh - minCh;
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    return chroma <= 18 && lum >= 202;
  };

  const enqueueIfBg = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (!isNeutralBackgroundPixel(idx)) return;
    visited[idx] = 1;
    removed[idx] = 1;
    queue[tail++] = idx;
  };

  // Seed along top edge completely
  for (let x = 0; x < width; x++) {
    enqueueIfBg(x, 0);
  }

  // Seed along upper/mid left and right edges (stopping above bottom coat corners)
  const sideMaxY = Math.floor(height * 0.92);
  for (let y = 0; y < sideMaxY; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(width - 1, y);
  }

  // Seed bottom corners outside the white lab coat torso region
  const coatLeftX = Math.floor(width * 0.16);
  const coatRightX = Math.floor(width * 0.84);
  for (let x = 0; x < coatLeftX; x++) {
    enqueueIfBg(x, height - 1);
  }
  for (let x = coatRightX; x < width; x++) {
    enqueueIfBg(x, height - 1);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx - x) / width;

    // Protect lower torso lab coat highlights if flood fill approaches center silhouette
    if (y > Math.floor(height * 0.56) && x >= coatLeftX && x <= coatRightX) {
      const offset = idx * 4;
      const lum = (data[offset] * 299 + data[offset + 1] * 587 + data[offset + 2] * 114) / 1000;
      const chroma =
        Math.max(data[offset], data[offset + 1], data[offset + 2]) -
        Math.min(data[offset], data[offset + 1], data[offset + 2]);
      if (chroma > 10 || lum < 224) {
        continue;
      }
    }

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x + 1 < width) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y + 1 < height) enqueueIfBg(x, y + 1);
  }

  // Two-pass despeckle to remove 1-2px neutral checkerboard confetti jutting along hair/flask edges
  for (let pass = 0; pass < 2; pass++) {
    const nextRemovals: number[] = [];
    for (let idx = 0; idx < total; idx++) {
      if (removed[idx]) continue;
      const x = idx % width;
      const y = (idx - x) / width;
      const offset = idx * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      if (chroma > 24 || lum < 188) continue;

      let orthoRemoved = 0;
      let diagRemoved = 0;
      if (x > 0 && removed[idx - 1]) orthoRemoved++;
      if (x + 1 < width && removed[idx + 1]) orthoRemoved++;
      if (y > 0 && removed[idx - width]) orthoRemoved++;
      if (y + 1 < height && removed[idx + width]) orthoRemoved++;
      if (x > 0 && y > 0 && removed[idx - width - 1]) diagRemoved++;
      if (x + 1 < width && y > 0 && removed[idx - width + 1]) diagRemoved++;
      if (x > 0 && y + 1 < height && removed[idx + width - 1]) diagRemoved++;
      if (x + 1 < width && y + 1 < height && removed[idx + width + 1]) diagRemoved++;

      if (orthoRemoved >= 3 || orthoRemoved + diagRemoved >= 5) {
        nextRemovals.push(idx);
      }
    }
    for (const idx of nextRemovals) {
      removed[idx] = 1;
    }
  }

  // Clear removed pixels and apply clean 1px anti-alias de-halo on light perimeter neighbors
  for (let idx = 0; idx < total; idx++) {
    const offset = idx * 4;
    if (removed[idx]) {
      data[offset + 3] = 0;
      continue;
    }

    const x = idx % width;
    const y = (idx - x) / width;
    const touchingRemoved =
      (x > 0 && removed[idx - 1]) ||
      (x + 1 < width && removed[idx + 1]) ||
      (y > 0 && removed[idx - width]) ||
      (y + 1 < height && removed[idx + width]);

    if (touchingRemoved) {
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      if (chroma <= 18 && lum >= 224) {
        data[offset + 3] = Math.min(data[offset + 3], 24);
      } else if (chroma <= 22 && lum >= 188) {
        data[offset + 3] = Math.min(data[offset + 3], 105);
      }
    }
  }
}

const cutoutCache = new Map<string, Promise<string>>();

export function createCutoutAvatarUrl(src: string): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(src);
  }

  const cached = cutoutCache.get(src);
  if (cached) return cached;

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(src);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        stripOuterCheckerboard(imageData.data, w, h);
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  cutoutCache.set(src, promise);
  return promise;
}
