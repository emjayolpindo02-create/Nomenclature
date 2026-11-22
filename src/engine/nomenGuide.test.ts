import test from 'node:test';
import assert from 'node:assert/strict';
import { answerLocallyWithNomenGuide, mapRuleTitleToLibraryId } from './nomenGuide.ts';

test('mapRuleTitleToLibraryId resolves all 8 rule titles cleanly', () => {
  assert.equal(mapRuleTitleToLibraryId('Writing Chemical Formulas'), 'writing-chemical-formulas');
  assert.equal(mapRuleTitleToLibraryId('Metal with One Oxidation Number + Nonmetal'), 'metal-one-oxidation-nonmetal');
  assert.equal(mapRuleTitleToLibraryId('Metal with Variable Oxidation Number + Nonmetal'), 'metal-variable-oxidation-nonmetal');
  assert.equal(mapRuleTitleToLibraryId('Nonmetal + Nonmetal'), 'nonmetal-nonmetal');
  assert.equal(mapRuleTitleToLibraryId('Hydrogen + Halogen (Binary Acids)'), 'hydrogen-halogen-binary-acids');
  assert.equal(mapRuleTitleToLibraryId('Metal with One Oxidation Number + Polyatomic Ion'), 'metal-one-oxidation-polyatomic');
  assert.equal(mapRuleTitleToLibraryId('Metal with Variable Oxidation Number + Polyatomic Ion'), 'metal-variable-oxidation-polyatomic');
  assert.equal(mapRuleTitleToLibraryId('Hydrogen + Polyatomic Ion (Ternary Acids)'), 'hydrogen-polyatomic-ternary-acids');
});

test('answerLocallyWithNomenGuide solves compound questions from natural language', () => {
  const res1 = answerLocallyWithNomenGuide('How do I name Fe2S3?');
  assert.equal(res1.formula, 'Fe2S3');
  assert.match(res1.reply.toLowerCase(), /iron \(iii\) sulfide/);
  assert.match(res1.reply.toLowerCase(), /ferric sulfide/);
  assert.equal(res1.libraryId, 'metal-variable-oxidation-nonmetal');

  const res2 = answerLocallyWithNomenGuide('What is the name of HNO2?');
  assert.equal(res2.formula, 'HNO2');
  assert.match(res2.reply.toLowerCase(), /nitrous acid/);
  assert.equal(res2.libraryId, 'hydrogen-polyatomic-ternary-acids');
});

test('answerLocallyWithNomenGuide routes conceptual questions to matching topic', () => {
  const res = answerLocallyWithNomenGuide('When should I use parentheses around a polyatomic ion?');
  assert.equal(res.libraryId, 'writing-chemical-formulas');
  assert.ok(res.reply.length > 20);

  const prefixRes = answerLocallyWithNomenGuide('How do Greek prefixes work for covalent compounds?');
  assert.equal(prefixRes.libraryId, 'nonmetal-nonmetal');
});

test('answerLocallyWithNomenGuide handles greetings and follow-up mistakes/steps', () => {
  const hi = answerLocallyWithNomenGuide('Hello Doctor Nomen!');
  assert.match(hi.reply.toLowerCase(), /doctor nomen/);

  const mistake = answerLocallyWithNomenGuide('What is a common mistake in Nonmetal + Nonmetal?');
  assert.equal(mistake.libraryId, 'nonmetal-nonmetal');
  assert.match(mistake.reply.toLowerCase(), /mistake|avoid/);
});
