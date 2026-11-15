import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_SEQUENCE,
  getLessonUnlockStatus,
  getLocalDateKey,
  getNextCalendarDayKey,
} from './lessonLock';
import { PracticeProgress } from '../types/chemistry';

test('First lesson (Writing Chemical Formulas) is always unlocked even with empty progress', () => {
  const status = getLessonUnlockStatus('writing-chemical-formulas', {}, 70, new Date(2026, 10, 14, 10, 0));
  assert.equal(status.unlocked, true);
  assert.equal(status.reason, 'unlocked');
});

test('Second lesson stays locked when first lesson has not been passed with required score', () => {
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: false,
      bestScore: 60,
      attempts: 1,
      passedDate: '',
      completedAt: new Date(2026, 10, 14, 9, 0).toISOString(),
    },
  };
  const status = getLessonUnlockStatus(
    'metal-one-oxidation-nonmetal',
    progress,
    70,
    new Date(2026, 10, 15, 9, 0)
  );
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'needs-score');
  assert.equal(status.previousTitle, 'Writing Chemical Formulas');
  assert.equal(status.requiredScore, 70);
});

test('Second lesson stays locked on the same day even after acquiring passing score', () => {
  const passDay = new Date(2026, 10, 14, 9, 0);
  const laterSameDay = new Date(2026, 10, 14, 23, 59);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      bestScore: 90,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      completedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, laterSameDay);
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'wait-next-day');
  assert.equal(status.passedDate, '2026-11-14');
  assert.equal(status.unlockDate, '2026-11-15');
  assert.ok(status.msUntilUnlock > 0);
});

test('Second lesson unlocks when the next day arrives and passing score was acquired', () => {
  const passDay = new Date(2026, 10, 14, 23, 50);
  const nextMorning = new Date(2026, 10, 15, 0, 1);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      bestScore: 80,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      completedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, nextMorning);
  assert.equal(status.unlocked, true);
  assert.equal(status.reason, 'unlocked');
});

test('Lesson remains locked if required score threshold is raised above previous best score', () => {
  const passDay = new Date(2026, 10, 14, 10, 0);
  const nextDay = new Date(2026, 10, 16, 10, 0);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      bestScore: 75,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      completedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 85, nextDay);
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'needs-score');
});

test('Month and year boundaries compute next calendar day accurately', () => {
  assert.equal(getNextCalendarDayKey('2026-11-30'), '2026-12-01');
  assert.equal(getNextCalendarDayKey('2026-12-31'), '2027-01-01');
  assert.equal(getNextCalendarDayKey('2028-02-28'), '2028-02-29');
});

test('All 9 curriculum steps (8 lessons + Final Mixed Review) follow strict sequential lock chain', () => {
  assert.equal(CURRICULUM_SEQUENCE.length, 9);
  for (let i = 1; i < CURRICULUM_SEQUENCE.length; i++) {
    const status = getLessonUnlockStatus(CURRICULUM_SEQUENCE[i].id, {}, 70, new Date(2026, 10, 14));
    assert.equal(status.unlocked, false);
    assert.equal(status.previousId, CURRICULUM_SEQUENCE[i - 1].id);
  }
});
