import test from 'node:test';
import assert from 'node:assert/strict';
import { stripOuterCheckerboard } from '../utils/avatarCutout';

test('stripOuterCheckerboard clears edge-connected neutral background while preserving colored subject and enclosed white', () => {
  const w = 6;
  const h = 6;
  const data = new Uint8ClampedArray(w * h * 4);

  // Fill entire image with light neutral grey/white checkerboard
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const v = (x + y) % 2 === 0 ? 250 : 215;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  // Draw a colored dark outline square around center (1..4, 1..4) with pure white inside (2..3, 2..3)
  for (let y = 1; y <= 4; y++) {
    for (let x = 1; x <= 4; x++) {
      const idx = (y * w + x) * 4;
      const isBorder = x === 1 || x === 4 || y === 1 || y === 4;
      if (isBorder) {
        // Dark brown/blue outline
        data[idx] = 45;
        data[idx + 1] = 65;
        data[idx + 2] = 95;
        data[idx + 3] = 255;
      } else {
        // Enclosed white coat/eyes inside outline
        data[idx] = 252;
        data[idx + 1] = 252;
        data[idx + 2] = 252;
        data[idx + 3] = 255;
      }
    }
  }

  stripOuterCheckerboard(data, w, h);

  // Top-left corner (0,0) white square and adjacent (1,0) grey square must both be transparent
  assert.equal(data[3], 0);
  assert.equal(data[1 * 4 + 3], 0);
  // Bottom-right corner (5,5) must be transparent
  assert.equal(data[(5 * w + 5) * 4 + 3], 0);
  // Outline pixel (1,1) must stay opaque
  assert.equal(data[(1 * w + 1) * 4 + 3], 255);
  // Enclosed white pixel (2,2) must stay opaque
  assert.equal(data[(2 * w + 2) * 4 + 3], 255);
});
