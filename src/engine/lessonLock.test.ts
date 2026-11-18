import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_SEQUENCE,
  getLessonUnlockStatus,
  getLocalDateKey,
  getNextCalendarDayKey,
} from './lessonLock';
import { PracticeProgress } from '../types/chemistry';

test('Guest mode: first lesson (Writing Chemical Formulas) is unlocked while all subsequent topics stay locked', () => {
  const first = getLessonUnlockStatus('writing-chemical-formulas', {}, 70, new Date(2026, 10, 14, 10, 0));
  assert.equal(first.unlocked, true);
  assert.equal(first.reason, 'unlocked');

  for (let i = 1; i < CURRICULUM_SEQUENCE.length; i++) {
    const locked = getLessonUnlockStatus(CURRICULUM_SEQUENCE[i].id, {}, 70, new Date(2026, 10, 15, 10, 0));
    assert.equal(locked.unlocked, false);
    assert.equal(locked.reason, 'needs-score');
  }
});

test('Unsubmitted scores NEVER unlock the next topic even when score >= passingScore and next day arrives', () => {
  const passDay = new Date(2026, 10, 14, 9, 0);
  const nextDay = new Date(2026, 10, 16, 9, 0);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: false,
      bestScore: 100,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      officialPassDate: getLocalDateKey(passDay),
      completedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus(
    'metal-one-oxidation-nonmetal',
    progress,
    70,
    nextDay
  );
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'needs-score');
});

test('Second lesson stays locked when submitted score is below required passing score', () => {
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: false,
      submitted: true,
      bestScore: 60,
      attempts: 1,
      passedDate: '',
      officialPassDate: '',
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
});

test('Queued passing score without official server pass date stays locked awaiting sync', () => {
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 90,
      attempts: 1,
      passedDate: '',
      officialPassDate: '',
      passedAt: null,
    },
  };

  const status = getLessonUnlockStatus(
    'metal-one-oxidation-nonmetal',
    progress,
    70,
    new Date(2026, 10, 16, 9, 0)
  );
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'awaiting-sync');
});

test('Second lesson stays locked on the same official day even after submitting a passing score', () => {
  const passDay = new Date(2026, 10, 14, 9, 0);
  const laterSameDay = new Date(2026, 10, 14, 23, 59);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 90,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      officialPassDate: getLocalDateKey(passDay),
      passedAt: passDay.toISOString(),
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

test('Second lesson unlocks when the next day arrives after official server pass date', () => {
  const passDay = new Date(2026, 10, 14, 23, 50);
  const nextMorning = new Date(2026, 10, 15, 0, 1);
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 80,
      attempts: 1,
      passedDate: getLocalDateKey(passDay),
      officialPassDate: getLocalDateKey(passDay),
      passedAt: passDay.toISOString(),
      completedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, nextMorning);
  assert.equal(status.unlocked, true);
  assert.equal(status.reason, 'unlocked');
});

test('Clock-backward check: topic stays locked if device clock moves backward after higher observed time or pass timestamp', () => {
  const passDay = new Date(2026, 10, 14, 15, 0);
  const observedFuture = new Date(2026, 10, 15, 10, 0).getTime();
  const rolledBackClock = new Date(2026, 10, 14, 10, 0); // moved backward!
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 95,
      attempts: 1,
      passedDate: '2026-11-14',
      officialPassDate: '2026-11-14',
      passedAt: passDay.toISOString(),
    },
  };

  const status = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, rolledBackClock, {
    highWaterNowMs: observedFuture,
  });
  assert.equal(status.unlocked, false);
  assert.equal(status.reason, 'clock-backward');
});

test('Section waitingTimeHours keeps topic locked until both next calendar day AND waiting hours have elapsed', () => {
  const passDay = new Date(2026, 10, 14, 22, 0);
  const earlyNextDay = new Date(2026, 10, 15, 8, 0); // 10h elapsed
  const after24h = new Date(2026, 10, 15, 22, 5); // 24h+ elapsed
  const progress: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 85,
      attempts: 1,
      officialPassDate: '2026-11-14',
      passedDate: '2026-11-14',
      passedAt: passDay.toISOString(),
    },
  };

  const lockedStatus = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, earlyNextDay, {
    waitingTimeHours: 24,
  });
  assert.equal(lockedStatus.unlocked, false);
  assert.equal(lockedStatus.reason, 'wait-next-day');

  const unlockedStatus = getLessonUnlockStatus('metal-one-oxidation-nonmetal', progress, 70, after24h, {
    waitingTimeHours: 24,
  });
  assert.equal(unlockedStatus.unlocked, true);
});

test('Teacher unlock override immediately opens a locked topic', () => {
  const status = getLessonUnlockStatus('nonmetal-nonmetal', {}, 70, new Date(2026, 10, 14), {
    unlockOverrides: ['nonmetal-nonmetal'],
  });
  assert.equal(status.unlocked, true);
  assert.equal(status.reason, 'unlocked');
});

test('Month and year boundaries compute next calendar day accurately', () => {
  assert.equal(getNextCalendarDayKey('2026-11-30'), '2026-12-01');
  assert.equal(getNextCalendarDayKey('2026-12-31'), '2027-01-01');
  assert.equal(getNextCalendarDayKey('2028-02-28'), '2028-02-29');
});

test('Final Mixed Review obeys the exact same score + next-day lock chain as core lessons', () => {
  const passDay = new Date(2026, 10, 14, 12, 0);
  const progress: Record<string, PracticeProgress> = {
    'hydrogen-polyatomic-ternary-acids': {
      libraryId: 'hydrogen-polyatomic-ternary-acids',
      passed: true,
      submitted: true,
      bestScore: 80,
      attempts: 1,
      officialPassDate: '2026-11-14',
      passedDate: '2026-11-14',
      passedAt: passDay.toISOString(),
    },
  };

  const sameDay = getLessonUnlockStatus('final-mixed-review', progress, 70, new Date(2026, 10, 14, 20, 0));
  assert.equal(sameDay.unlocked, false);
  assert.equal(sameDay.reason, 'wait-next-day');

  const nextDay = getLessonUnlockStatus('final-mixed-review', progress, 70, new Date(2026, 10, 15, 7, 0));
  assert.equal(nextDay.unlocked, true);
});
