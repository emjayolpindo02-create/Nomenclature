import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTextForClearSpeech,
  isVoiceLikelyMale,
  resolveClearManlyPitch,
  selectPreferredClearVoice,
  VoiceLike,
} from './guideVoice';

test('selectPreferredClearVoice avoids robotic novelty and high-pitched female voices in favor of clear manly English voices', () => {
  const voices: VoiceLike[] = [
    { name: 'Fred', lang: 'en-US', voiceURI: 'Fred', localService: true },
    { name: 'Zarvox', lang: 'en-US', voiceURI: 'Zarvox', localService: true },
    { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English', localService: false },
    { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true },
    { name: 'Google UK English Male', lang: 'en-GB', voiceURI: 'Google UK English Male', localService: false },
    { name: 'Daniel (Enhanced)', lang: 'en-GB', voiceURI: 'Daniel-Enhanced', localService: true },
  ];

  const picked = selectPreferredClearVoice(voices, '', true);
  assert.equal(picked?.name, 'Daniel (Enhanced)');
  assert.equal(isVoiceLikelyMale(voices[0]), false);
  assert.equal(isVoiceLikelyMale(voices[2]), false);
  assert.equal(isVoiceLikelyMale(voices[4]), true);
  assert.equal(isVoiceLikelyMale(voices[5]), true);

  // Even online when localService is false, Google UK English Male beats Google US English
  const onlineOnly = [voices[2], voices[4]];
  const onlinePicked = selectPreferredClearVoice(onlineOnly, '', false);
  assert.equal(onlinePicked?.name, 'Google UK English Male');
});

test('resolveClearManlyPitch keeps pitch low and clear and deepens female fallback voices gently', () => {
  assert.equal(resolveClearManlyPitch(0.84, { name: 'Daniel', voiceURI: 'Daniel' }), 0.84);
  assert.equal(resolveClearManlyPitch(0.84, { name: 'Google US English', voiceURI: 'Google US English' }), 0.78);
});

test('selectPreferredClearVoice honors explicit user voiceURI selection', () => {
  const voices: VoiceLike[] = [
    { name: 'Daniel', lang: 'en-GB', voiceURI: 'Daniel', localService: true },
    { name: 'Microsoft David', lang: 'en-US', voiceURI: 'David', localService: true },
  ];
  const picked = selectPreferredClearVoice(voices, 'David', true);
  assert.equal(picked?.voiceURI, 'David');
});

test('formatTextForClearSpeech expands subscripts, Roman numerals, and chemical formulas clearly', () => {
  const spoken1 = formatTextForClearSpeech('Fe₂S₃ is named iron (III) sulfide.');
  assert.match(spoken1, /F E 2 S 3/);
  assert.match(spoken1, /iron 3 sulfide/);

  const spoken2 = formatTextForClearSpeech('Ca₃(PO₄)₂ requires parentheses and ≥70% to pass.');
  assert.match(spoken2, /C A 3, P O 4, 2/);
  assert.match(spoken2, /at least 70 percent/);

  const spoken3 = formatTextForClearSpeech('Welcome to the Compound Naming Guide!');
  assert.equal(spoken3, 'Welcome to the Compound Naming Guide!');
});
