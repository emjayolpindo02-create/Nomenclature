import test from 'node:test';
import assert from 'node:assert/strict';
import { answerGuideQuestion, buildPracticeFeedbackReply } from './guideBrain';
import { solveCompound } from './namingEngine';
import { PRACTICE_SETS } from '../data/practiceQuestions';

test('answerGuideQuestion answers formulas and names consistently with namingEngine', () => {
  const q1 = answerGuideQuestion('What is the name of Fe2S3?');
  const engine1 = solveCompound('Fe2S3');
  assert.ok(engine1);
  assert.equal(q1.formula, engine1.formula);
  assert.equal(q1.iupacName, engine1.iupacName);
  assert.equal(q1.traditionalName, engine1.traditionalName);
  assert.equal(q1.ruleTitle, engine1.ruleTitle);
  assert.deepEqual(q1.parts, engine1.parts);

  const q2 = answerGuideQuestion('What is the formula of calcium phosphate?');
  const engine2 = solveCompound('calcium phosphate');
  assert.ok(engine2);
  assert.equal(q2.formula, 'Ca3(PO4)2');
  assert.equal(q2.iupacName, engine2.iupacName);

  const q3 = answerGuideQuestion('Name H2SO4');
  assert.equal(q3.formula, 'H2SO4');
  assert.equal(q3.iupacName, 'sulfuric acid');

  // Typo tolerance on compound names
  const qTypo = answerGuideQuestion('What is the formula of calcum phosphat?');
  assert.equal(qTypo.formula, 'Ca3(PO4)2');
});

test('answerGuideQuestion answers rule questions with fuzzy typo tolerance and library link', () => {
  const binary = answerGuideQuestion('How do I name binary acids?');
  assert.equal(binary.libraryId, 'hydrogen-halogen-binary-acids');
  assert.ok(binary.text.toLowerCase().includes('hydro-'));
  assert.ok((binary.examples?.length || 0) >= 1);

  const ousIc = answerGuideQuestion('When do I use -ous and -ic?');
  assert.equal(ousIc.libraryId, 'metal-variable-oxidation-nonmetal');
  assert.ok(ousIc.text.includes('-ous'));

  const prefixesTypo = answerGuideQuestion('What are the prefxies?');
  assert.equal(prefixesTypo.libraryId, 'nonmetal-nonmetal');
  assert.ok(prefixesTypo.text.toLowerCase().includes('mono'));

  const ox = answerGuideQuestion('What is an oxidaton numbr?');
  assert.equal(ox.libraryId, 'writing-chemical-formulas');
});

test('answerGuideQuestion answers periodic table element questions from element data', () => {
  const fe = answerGuideQuestion('What is the oxidation number of iron?');
  assert.ok(fe.text.includes('Iron'));
  assert.ok(fe.text.includes('+2') && fe.text.includes('+3'));

  const cl = answerGuideQuestion('Is chlorine a metal?');
  assert.ok(cl.text.toLowerCase().includes('no, chlorine'));
  assert.ok(cl.text.toLowerCase().includes('nonmetal'));

  const pb = answerGuideQuestion('What is the symbol of lead?');
  assert.ok(pb.text.includes('Pb'));
});

test('answerGuideQuestion reflects live app state for locks and score submission', () => {
  const locked = answerGuideQuestion('Why is this topic locked?', {
    currentTab: 'libraries',
    currentLibraryId: 'nonmetal-nonmetal',
    isOnline: false,
    isSignedIn: false,
    passingScore: 75,
    queuedCount: 2,
    isCurrentLibraryUnlocked: false,
    practiceInProgress: false,
  });
  assert.ok(locked.text.includes('75%'));
  assert.ok(locked.text.toLowerCase().includes('tomorrow'));

  const submit = answerGuideQuestion('How do I submit my score?', {
    currentTab: 'practice',
    currentLibraryId: 'writing-chemical-formulas',
    isOnline: false,
    isSignedIn: true,
    username: 'alex',
    passingScore: 70,
    queuedCount: 3,
    isCurrentLibraryUnlocked: true,
    practiceInProgress: false,
  });
  assert.ok(submit.text.includes('3 pending score'));
  assert.ok(submit.text.includes('alex'));
});

test('answerGuideQuestion refuses out-of-scope questions honestly without inventing chemistry', () => {
  const oos = answerGuideQuestion('Who won the 2022 FIFA World Cup?');
  assert.equal(oos.outOfScope, true);
  assert.equal(oos.formula, undefined);
  assert.ok(oos.text.toLowerCase().includes('only help with'));
});

test('CRITICAL PRACTICE GUARD: never reveals answers during active practice', () => {
  const sampleQ = PRACTICE_SETS[1].questions[0];
  const guarded = answerGuideQuestion(`What is the name of ${sampleQ.formula || 'Fe2S3'}?`, {
    currentTab: 'practice',
    currentLibraryId: 'metal-variable-oxidation-nonmetal',
    isOnline: true,
    isSignedIn: false,
    passingScore: 70,
    queuedCount: 0,
    isCurrentLibraryUnlocked: true,
    practiceInProgress: true,
    activeQuestion: sampleQ,
    isActiveQuestionSubmitted: false,
  });

  assert.equal(guarded.blockedByPractice, true);
  assert.equal(guarded.formula, undefined);
  assert.equal(guarded.iupacName, undefined);
  assert.equal(guarded.text.toLowerCase().includes(sampleQ.correctAnswer.toLowerCase()), false);
});

test('buildPracticeFeedbackReply explains correctness using rule and picks a new example', () => {
  const q = PRACTICE_SETS[2].questions[0];
  const fb = buildPracticeFeedbackReply(q, false);
  assert.ok(fb.libraryId);
  assert.ok((fb.examples?.length || 0) >= 1);
  assert.ok(fb.text.includes(q.explanation));
});
