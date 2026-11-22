import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpeechTimeline,
  CLOSED_MOUTH_POSE,
  findWordIndexForCharIndex,
  resolveEffectiveAnimationMode,
  sampleFaceLifeState,
  sampleMouthAnimation,
} from './guideSpeechTimeline';

test('buildSpeechTimeline detects words, punctuation pauses, and rounded/wide/teeth visemes', () => {
  const tl = buildSpeechTimeline('Look closely, please: oxygen!');
  assert.equal(tl.words.length, 4);
  assert.equal(tl.words[1].hasPauseAfter, true);
  assert.equal(tl.words[3].hasPauseAfter, true);
  assert.ok(tl.words[0].visemes.includes('round')); // "oo"
  assert.ok(tl.words[2].visemes.includes('teeth')); // "ea" / "s"
});

test('sampleMouthAnimation opens during talking, closes during pauses and never freezes open', () => {
  const tl = buildSpeechTimeline('Alpha, beta.', 1.0);
  // Idle closes immediately
  const idleSample = sampleMouthAnimation(tl, 50, { isSpeaking: false });
  assert.equal(idleSample.pose.openness, 0);
  assert.equal(idleSample.pose.shape, 'closed');

  // Inside first word -> mouth moves/opens
  const midFirstWord = tl.words[0].estimatedStartMs + 40;
  const talkingSample = sampleMouthAnimation(tl, midFirstWord, { isSpeaking: true });
  assert.ok(talkingSample.pose.openness > 0.1);
  assert.equal(talkingSample.activeWordIndex, 0);

  // Inside punctuation pause between word 0 and word 1 -> mouth closes
  const pauseMidMs = Math.floor((tl.words[0].estimatedEndMs + tl.words[1].estimatedStartMs) / 2);
  const pauseSample = sampleMouthAnimation(tl, pauseMidMs, { isSpeaking: true });
  assert.deepEqual(pauseSample.pose, CLOSED_MOUTH_POSE);

  // Past end of timeline + grace window -> mouth auto-closes cleanly
  const pastEnd = sampleMouthAnimation(tl, tl.totalEstimatedMs + 800, { isSpeaking: true });
  assert.deepEqual(pastEnd.pose, CLOSED_MOUTH_POSE);
  assert.equal(pastEnd.finished, true);
});

test('findWordIndexForCharIndex tracks boundary offsets accurately', () => {
  const tl = buildSpeechTimeline('Iron three sulfide');
  assert.equal(findWordIndexForCharIndex(tl, 0), 0);
  assert.equal(findWordIndexForCharIndex(tl, 5), 1);
  assert.equal(findWordIndexForCharIndex(tl, 11), 2);
});

test('sampleFaceLifeState blinks periodically and zeros out under reduced motion', () => {
  const reduced = sampleFaceLifeState(50, 'talking', true);
  assert.equal(reduced.blinkAmount, 0);
  assert.equal(reduced.headTiltDeg, 0);

  const midBlink = sampleFaceLifeState(85, 'idle', false);
  assert.ok(midBlink.blinkAmount > 0.5);
});

test('resolveEffectiveAnimationMode respects reduced motion and missing canvas fallback', () => {
  assert.equal(
    resolveEffectiveAnimationMode({
      requestedLevel: 'full',
      prefersReducedMotion: true,
      appAnimationsEnabled: true,
      canvasSupported: true,
    }),
    'still'
  );
  assert.equal(
    resolveEffectiveAnimationMode({
      requestedLevel: 'full',
      prefersReducedMotion: false,
      appAnimationsEnabled: true,
      canvasSupported: false,
    }),
    'simple'
  );
  assert.equal(
    resolveEffectiveAnimationMode({
      requestedLevel: 'full',
      prefersReducedMotion: false,
      appAnimationsEnabled: true,
      canvasSupported: true,
    }),
    'full'
  );
});
