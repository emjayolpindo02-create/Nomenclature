import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTopicAccess,
  formatTopicWaitLabel,
  getManilaDateKey,
  getNextManilaMidnightMs,
} from './topicAccess';

describe('topicAccess (device-saved 75% pass & 12:00 AM Asia/Manila unlock)', () => {
  it('unlocks Topic 1 immediately and keeps Topic 2 locked until >= 75% pass', () => {
    const t1 = evaluateTopicAccess('ionic-compounds', { progressMap: {} });
    assert.equal(t1.unlocked, true);
    assert.equal(t1.reason, 'unlocked');

    const t2Fresh = evaluateTopicAccess('polyatomic-ions', { progressMap: {} });
    assert.equal(t2Fresh.unlocked, false);
    assert.equal(t2Fresh.reason, 'needs-score');
    assert.equal(t2Fresh.requiredScore, 75);

    const passTimeMs = Date.UTC(2026, 10, 23, 6, 0, 0); // 14:00 Manila
    const t2Failed = evaluateTopicAccess('polyatomic-ions', {
      progressMap: {
        'ionic-compounds': {
          passed: false,
          score: 70,
          bestScore: 70,
          attempts: 1,
          passedAtMs: null,
        },
      },
      nowMs: passTimeMs + 60_000,
    });
    assert.equal(t2Failed.unlocked, false);
    assert.equal(t2Failed.reason, 'needs-score');
  });

  it('starts countdown until 12:00 AM Asia/Manila after passing >= 75% and unlocks at midnight', () => {
    const passTimeMs = Date.UTC(2026, 10, 23, 6, 0, 0); // 2026-11-23 14:00 Manila
    const expectedMidnightMs = Date.UTC(2026, 10, 23, 16, 0, 0); // 2026-11-24 00:00 Manila

    assert.equal(getManilaDateKey(passTimeMs), '2026-11-23');
    assert.equal(getNextManilaMidnightMs(passTimeMs), expectedMidnightMs);

    const progressMap = {
      'ionic-compounds': {
        passed: true,
        score: 83,
        bestScore: 83,
        attempts: 1,
        passedAtMs: passTimeMs,
      },
    };

    const sameDay = evaluateTopicAccess('polyatomic-ions', {
      progressMap,
      nowMs: passTimeMs + 30 * 60_000,
    });
    assert.equal(sameDay.unlocked, false);
    assert.equal(sameDay.reason, 'wait-next-day');
    assert.equal(sameDay.unlockAtMs, expectedMidnightMs);
    assert.equal(sameDay.lockLabel, 'Opens in 9h 30m');

    const earlyPassMs = Date.UTC(2026, 10, 23, 0, 0, 0);
    assert.equal(
      formatTopicWaitLabel(getNextManilaMidnightMs(earlyPassMs), earlyPassMs),
      'Opens tomorrow'
    );

    const afterMidnight = evaluateTopicAccess('polyatomic-ions', {
      progressMap,
      nowMs: expectedMidnightMs,
    });
    assert.equal(afterMidnight.unlocked, true);
    assert.equal(afterMidnight.reason, 'unlocked');
  });
});
