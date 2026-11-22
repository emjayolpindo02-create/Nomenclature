import { FaceCalibration, FaceLifeState, MouthPose } from '../types/guide';

export interface MeshPoint {
  x: number;
  y: number;
}

export interface FaceMeshGrid {
  cols: number;
  rows: number;
  srcPoints: MeshPoint[];
  dstPoints: MeshPoint[];
}

/**
 * Computes piecewise vertex displacement for only the mouth, jaw, and eyebrows
 * while anchoring outer face/hair/background vertices strictly at (dx=0, dy=0).
 */
export function buildDeformedFaceMesh(
  width: number,
  height: number,
  calibration: FaceCalibration,
  pose: MouthPose,
  life: FaceLifeState,
  cols: number = 12,
  rows: number = 12
): FaceMeshGrid {
  const srcPoints: MeshPoint[] = [];
  const dstPoints: MeshPoint[] = [];

  const mouthCx = ((calibration.mouthLeft.x + calibration.mouthRight.x) * 0.5) * width;
  const mouthCy = calibration.mouthTop.y * height;
  const mouthWidth = Math.max(
    width * 0.08,
    Math.abs(calibration.mouthRight.x - calibration.mouthLeft.x) * width
  );
  const chinY = Math.max(mouthCy + height * 0.04, calibration.chin.y * height);
  const jawHeight = Math.max(height * 0.06, chinY - mouthCy);

  // Localized radius so distortion NEVER leaks outside lower face/jaw
  const rx = mouthWidth * 1.05;
  const ryUp = jawHeight * 0.42;
  const ryDown = jawHeight * 1.45;

  const browCx = ((calibration.leftEye.x + calibration.rightEye.x) * 0.5) * width;
  const browCy = (Math.min(calibration.leftEye.y, calibration.rightEye.y) - 0.035) * height;
  const browRx = Math.max(width * 0.14, Math.abs(calibration.rightEye.x - calibration.leftEye.x) * width * 0.85);
  const browRy = height * 0.055;

  const maxJawDrop = jawHeight * 0.34 * pose.openness;
  const cornerScaleShift = (pose.widthFactor - 1) * (mouthWidth * 0.24);
  const maxBrowLift = height * 0.012 * life.eyebrowLift;

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const sy = v * height;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const sx = u * width;
      srcPoints.push({ x: sx, y: sy });

      // Hard anchor image perimeter
      if (r === 0 || r === rows || c === 0 || c === cols) {
        dstPoints.push({ x: sx, y: sy });
        continue;
      }

      let dx = 0;
      let dy = 0;

      // Mouth & Jaw localized deformation
      const normX = (sx - mouthCx) / rx;
      const normY = sy >= mouthCy ? (sy - mouthCy) / ryDown : (sy - mouthCy) / ryUp;
      const distSq = normX * normX + normY * normY;

      if (distSq < 1.0) {
        const w = Math.pow(1 - distSq, 1.8);
        if (sy >= mouthCy) {
          // Lower lip & jaw moves downward smoothly while tapering toward chin edge
          const verticalBand = Math.sin(Math.min(1, (sy - mouthCy) / ryDown) * Math.PI);
          dy += maxJawDrop * w * (0.45 + 0.55 * verticalBand);
        } else {
          // Slight subtle upper-lip lift on wide / teeth visemes
          const upperFactor = pose.shape === 'wide' || pose.shape === 'teeth' ? 0.22 : 0.1;
          dy -= maxJawDrop * upperFactor * w;
        }

        // Horizontal corner pull for rounded "oo" or wide "ee"
        if (Math.abs(sx - mouthCx) > 1 && Math.abs(sy - mouthCy) < jawHeight * 0.65) {
          const sign = sx > mouthCx ? 1 : -1;
          const xProximity = Math.min(1, Math.abs(sx - mouthCx) / (mouthWidth * 0.6));
          dx += sign * cornerScaleShift * w * xProximity;
        }
      }

      // Subtle eyebrow lift while speaking
      if (maxBrowLift > 0.05) {
        const bx = (sx - browCx) / browRx;
        const by = (sy - browCy) / browRy;
        const bDistSq = bx * bx + by * by;
        if (bDistSq < 1.0) {
          const bw = Math.pow(1 - bDistSq, 2);
          dy -= maxBrowLift * bw;
        }
      }

      dstPoints.push({
        x: Math.min(width, Math.max(0, sx + dx)),
        y: Math.min(height, Math.max(0, sy + dy)),
      });
    }
  }

  return { cols, rows, srcPoints, dstPoints };
}

export function computeAffineMatrix(
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
  sx2: number,
  sy2: number,
  d0: MeshPoint,
  d1: MeshPoint,
  d2: MeshPoint
): [number, number, number, number, number, number] | null {
  const denom = sx0 * (sy1 - sy2) - sy0 * (sx1 - sx2) + (sx1 * sy2 - sx2 * sy1);
  if (Math.abs(denom) < 1e-4) return null;

  const a = (d0.x * (sy1 - sy2) - d1.x * (sy0 - sy2) + d2.x * (sy0 - sy1)) / denom;
  const b = (d0.y * (sy1 - sy2) - d1.y * (sy0 - sy2) + d2.y * (sy0 - sy1)) / denom;
  const c = (sx0 * (d1.x - d2.x) - sx1 * (d0.x - d2.x) + sx2 * (d0.x - d1.x)) / denom;
  const d = (sx0 * (d1.y - d2.y) - sx1 * (d0.y - d2.y) + sx2 * (d0.y - d1.y)) / denom;
  const e =
    (d0.x * (sx1 * sy2 - sx2 * sy1) -
      d1.x * (sx0 * sy2 - sx2 * sy0) +
      d2.x * (sx0 * sy1 - sx1 * sy0)) /
    denom;
  const f =
    (d0.y * (sx1 * sy2 - sx2 * sy1) -
      d1.y * (sx0 * sy2 - sx2 * sy0) +
      d2.y * (sx0 * sy1 - sx1 * sy0)) /
    denom;

  return [a, b, c, d, e, f];
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: MeshPoint,
  s1: MeshPoint,
  s2: MeshPoint,
  d0: MeshPoint,
  d1: MeshPoint,
  d2: MeshPoint,
  imgScaleX: number,
  imgScaleY: number
): void {
  const sx0 = s0.x * imgScaleX;
  const sy0 = s0.y * imgScaleY;
  const sx1 = s1.x * imgScaleX;
  const sy1 = s1.y * imgScaleY;
  const sx2 = s2.x * imgScaleX;
  const sy2 = s2.y * imgScaleY;

  const matrix = computeAffineMatrix(sx0, sy0, sx1, sy1, sx2, sy2, d0, d1, d2);
  if (!matrix) return;

  // Slightly expand destination triangle from centroid by 0.45px to avoid hairline seams
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const expand = (p: MeshPoint): MeshPoint => {
    const vx = p.x - cx;
    const vy = p.y - cy;
    const len = Math.hypot(vx, vy) || 1;
    return { x: p.x + (vx / len) * 0.45, y: p.y + (vy / len) * 0.45 };
  };
  const p0 = expand(d0);
  const p1 = expand(d1);
  const p2 = expand(d2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();

  ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Renders the animated portrait frame (mouth/jaw warp + inner mouth cavity shadow + eye blink).
 */
export function renderAnimatedGuideFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  calibration: FaceCalibration,
  pose: MouthPose,
  life: FaceLifeState
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth * 0.5;
  const cy = canvasHeight * 0.5;

  ctx.save();
  ctx.translate(cx + life.headOffsetX, cy + life.headOffsetY);
  ctx.rotate((life.headTiltDeg * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  const scaleX = naturalWidth / canvasWidth;
  const scaleY = naturalHeight / canvasHeight;

  if (pose.openness < 0.02 && life.eyebrowLift < 0.05) {
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  } else {
    const mesh = buildDeformedFaceMesh(canvasWidth, canvasHeight, calibration, pose, life, 12, 12);
    const stride = mesh.cols + 1;
    for (let r = 0; r < mesh.rows; r++) {
      for (let c = 0; c < mesh.cols; c++) {
        const i0 = r * stride + c;
        const i1 = i0 + 1;
        const i2 = i0 + stride;
        const i3 = i2 + 1;

        drawTexturedTriangle(
          ctx,
          img,
          mesh.srcPoints[i0],
          mesh.srcPoints[i1],
          mesh.srcPoints[i2],
          mesh.dstPoints[i0],
          mesh.dstPoints[i1],
          mesh.dstPoints[i2],
          scaleX,
          scaleY
        );
        drawTexturedTriangle(
          ctx,
          img,
          mesh.srcPoints[i1],
          mesh.srcPoints[i3],
          mesh.srcPoints[i2],
          mesh.dstPoints[i1],
          mesh.dstPoints[i3],
          mesh.dstPoints[i2],
          scaleX,
          scaleY
        );
      }
    }

    // Soft inner-mouth shadow & faint upper teeth rim when open
    if (pose.openness > 0.06) {
      const mLeftX = calibration.mouthLeft.x * canvasWidth;
      const mRightX = calibration.mouthRight.x * canvasWidth;
      const mouthCx = (mLeftX + mRightX) * 0.5;
      const baseMouthW = Math.max(canvasWidth * 0.06, Math.abs(mRightX - mLeftX));
      const rx = (baseMouthW * 0.34) * pose.widthFactor;
      const mouthTopY = calibration.mouthTop.y * canvasHeight;
      const jawDrop = Math.max(canvasHeight * 0.04, (calibration.chin.y - calibration.mouthTop.y) * canvasHeight);
      const openingY = mouthTopY + jawDrop * 0.08;
      const ry = Math.max(1.5, jawDrop * 0.14 * pose.openness);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(mouthCx, openingY + ry * 0.45, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();

      const grad = ctx.createRadialGradient(
        mouthCx,
        openingY + ry * 0.5,
        ry * 0.15,
        mouthCx,
        openingY + ry * 0.5,
        Math.max(rx, ry) * 1.05
      );
      grad.addColorStop(0, `rgba(24, 10, 12, ${(0.56 * pose.innerShadow).toFixed(3)})`);
      grad.addColorStop(0.75, `rgba(45, 18, 20, ${(0.36 * pose.innerShadow).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(45, 18, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(mouthCx - rx - 2, openingY - ry - 2, (rx + 2) * 2, (ry + 2) * 3);

      if (pose.teethAmount > 0.18) {
        ctx.fillStyle = `rgba(255, 250, 244, ${(0.34 * pose.teethAmount).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(mouthCx, openingY + ry * 0.08, rx * 0.72, ry * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Soft natural eyelid blink overlay
  if (life.blinkAmount > 0.08) {
    const eyeRx = canvasWidth * 0.042;
    const eyeRy = canvasHeight * 0.028 * life.blinkAmount;
    const drawBlink = (ex: number, ey: number) => {
      ctx.save();
      ctx.fillStyle = `rgba(214, 152, 118, ${(0.78 * life.blinkAmount).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeRx, eyeRy, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(48, 28, 22, ${(0.55 * life.blinkAmount).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, canvasWidth * 0.008);
      ctx.beginPath();
      ctx.moveTo(ex - eyeRx * 0.9, ey + eyeRy * 0.15);
      ctx.quadraticCurveTo(ex, ey + eyeRy * 0.7, ex + eyeRx * 0.9, ey + eyeRy * 0.15);
      ctx.stroke();
      ctx.restore();
    };
    drawBlink(calibration.leftEye.x * canvasWidth, calibration.leftEye.y * canvasHeight);
    drawBlink(calibration.rightEye.x * canvasWidth, calibration.rightEye.y * canvasHeight);
  }

  ctx.restore();
}
