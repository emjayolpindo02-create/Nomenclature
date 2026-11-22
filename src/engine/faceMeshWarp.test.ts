import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeformedFaceMesh, computeAffineMatrix } from './faceMeshWarp';
import { DEFAULT_FACE_CALIBRATION, shapeToMouthPose } from './guideSpeechTimeline';

test('computeAffineMatrix maps source triangle vertices exactly to destination vertices', () => {
  const s0 = { x: 10, y: 20 };
  const s1 = { x: 40, y: 20 };
  const s2 = { x: 10, y: 60 };
  const d0 = { x: 20, y: 40 };
  const d1 = { x: 80, y: 40 };
  const d2 = { x: 20, y: 126 }; // slight downward stretch on s2

  const matrix = computeAffineMatrix(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y, d0, d1, d2);
  assert.ok(matrix);
  const [a, b, c, d, e, f] = matrix;

  const mapPt = (x: number, y: number) => ({
    x: a * x + c * y + e,
    y: b * x + d * y + f,
  });

  const p0 = mapPt(s0.x, s0.y);
  const p1 = mapPt(s1.x, s1.y);
  const p2 = mapPt(s2.x, s2.y);

  assert.ok(Math.abs(p0.x - d0.x) < 1e-6 && Math.abs(p0.y - d0.y) < 1e-6);
  assert.ok(Math.abs(p1.x - d1.x) < 1e-6 && Math.abs(p1.y - d1.y) < 1e-6);
  assert.ok(Math.abs(p2.x - d2.x) < 1e-6 && Math.abs(p2.y - d2.y) < 1e-6);
  // Positive determinant and scale factors (no flip)
  assert.ok(a > 1.9 && d > 2.0);
});

test('buildDeformedFaceMesh anchors edges and shifts only lower mouth/jaw when talking', () => {
  const closedLife = {
    blinkAmount: 0,
    headTiltDeg: 0,
    headOffsetX: 0,
    headOffsetY: 0,
    eyebrowLift: 0,
  };
  const widePose = shapeToMouthPose('wide', 1);
  const mesh = buildDeformedFaceMesh(200, 200, DEFAULT_FACE_CALIBRATION, widePose, closedLife, 12, 12);

  // Corner and perimeter vertices remain strictly stationary
  assert.deepEqual(mesh.dstPoints[0], mesh.srcPoints[0]);
  assert.deepEqual(mesh.dstPoints[mesh.dstPoints.length - 1], mesh.srcPoints[mesh.srcPoints.length - 1]);

  // Vertex right below mouth center (~x=104, y=75-85) moves downward relative to src
  let maxJawDisplacement = 0;
  for (let i = 0; i < mesh.srcPoints.length; i++) {
    const s = mesh.srcPoints[i];
    const d = mesh.dstPoints[i];
    if (s.y > 68 && s.y < 95 && s.x > 85 && s.x < 120) {
      maxJawDisplacement = Math.max(maxJawDisplacement, d.y - s.y);
    }
    // Lower chest/bottom of card (y > 160) should be completely untouched
    if (s.y >= 160) {
      assert.equal(d.y, s.y);
      assert.equal(d.x, s.x);
    }
  }
  assert.ok(maxJawDisplacement > 0.5);
});
