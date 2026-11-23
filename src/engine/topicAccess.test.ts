import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTopicAccess,
  formatTopicWaitLabel,
  getDailyRetryStatus,
  getManilaDateKey,
  getNextManilaMidnightMs,
} from './topicAccess';
import { StudentProfile, TopicsSettingsDoc } from '../types/chemistry';

function makeStudent(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    uid: 'student-1',
    displayName: 'Juan Dela Cruz',
    section: '3F',
    email: 'juan@example.com',
    isAnonymous: false,
    approved: true,
    blocked: false,
    progress: {},
    ...overrides,
  };
}

function makeSettings(overrides: Partial<TopicsSettingsDoc> = {}): TopicsSettingsDoc {
  return {
    maxRetriesPerDay: 3,
    topics: {},
    ...overrides,
  };
}

describe('topicAccess (Asia/Manila unlock & teacher override rules)', () => {
  it('allows guests (null profile) to unlock Topic 1 freely and follow Pass & Wait via device progress', () => {
    const passTimeMs = Date.UTC(2026, 10, 23, 6, 0, 0); // 14:00 Manila
    const expectedMidnightMs = Date.UTC(2026, 10, 23, 16, 0, 0);

    const t1 = evaluateTopicAccess('ionic-compounds', {
      studentProfile: null,
      topicsSettings: null,
    });
    assert.equal(t1.unlocked, true);
    assert.equal(t1.reason, 'unlocked');

    // Fresh guest has not passed Topic 1 -> Topic 2 needs >= 75%
    const t2Fresh = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: null,
      topicsSettings: null,
    });
    assert.equal(t2Fresh.unlocked, false);
    assert.equal(t2Fresh.reason, 'needs-score');

    // Failing Topic 1 keeps Topic 2 at needs-score (no wait timer started)
    const t2Failed = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: null,
      topicsSettings: null,
      guestProgress: {
        'ionic-compounds': {
          passed: false,
          score: 60,
          bestScore: 60,
          attempts: 1,
          passedAtMs: null,
        },
      },
      nowMs: passTimeMs + 60_000,
    });
    assert.equal(t2Failed.unlocked, false);
    assert.equal(t2Failed.reason, 'needs-score');

    // Passing Topic 1 on device starts the wait until 12:00 AM Asia/Manila
    const guestPassed = {
      'ionic-compounds': {
        passed: true,
        score: 85,
        bestScore: 85,
        attempts: 1,
        passedAtMs: passTimeMs,
      },
    };
    const t2Waiting = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: null,
      topicsSettings: null,
      guestProgress: guestPassed,
      nowMs: passTimeMs + 30 * 60_000,
    });
    assert.equal(t2Waiting.unlocked, false);
    assert.equal(t2Waiting.reason, 'wait-next-day');
    assert.equal(t2Waiting.unlockAtMs, expectedMidnightMs);

    // At 12:00 AM Asia/Manila next day, guest unlocks Topic 2
    const t2Unlocked = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: null,
      topicsSettings: null,
      guestProgress: guestPassed,
      nowMs: expectedMidnightMs,
    });
    assert.equal(t2Unlocked.unlocked, true);
    assert.equal(t2Unlocked.reason, 'unlocked');
  });

  it('lets unapproved students learn locally with Pass & Wait without applying teacher overrides', () => {
    const unapproved = makeStudent({ approved: false });
    const passTimeMs = Date.UTC(2026, 10, 23, 6, 0, 0);

    const t1 = evaluateTopicAccess('ionic-compounds', {
      studentProfile: unapproved,
      topicsSettings: makeSettings({
        topics: { 'ionic-compounds': { lockedForEveryone: true } },
      }),
    });
    assert.equal(t1.unlocked, true);

    const t2Waiting = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: unapproved,
      topicsSettings: null,
      guestProgress: {
        'ionic-compounds': {
          passed: true,
          score: 80,
          bestScore: 80,
          attempts: 1,
          passedAtMs: passTimeMs,
        },
      },
      nowMs: passTimeMs + 10_000,
    });
    assert.equal(t2Waiting.unlocked, false);
    assert.equal(t2Waiting.reason, 'wait-next-day');
  });

  it('locks all topics when a student is blocked by the teacher', () => {
    const blocked = makeStudent({ blocked: true, approved: true });
    const t1 = evaluateTopicAccess('ionic-compounds', {
      studentProfile: blocked,
      topicsSettings: null,
    });
    assert.equal(t1.unlocked, false);
    assert.equal(t1.reason, 'blocked');
    assert.equal(t1.lockLabel, 'Account paused by your teacher');
  });

  it('allows teachers to view all topics unlocked unconditionally', () => {
    const t5 = evaluateTopicAccess('mixed-practice', {
      studentProfile: null,
      topicsSettings: makeSettings({
        topics: {
          'mixed-practice': { lockedForEveryone: true },
        },
      }),
      isTeacher: true,
    });
    assert.equal(t5.unlocked, true);
  });

  it('requires >= 75% pass on Topic 1 and waits until 12:00 AM Asia/Manila next day', () => {
    // 2026-11-23 14:00:00 Manila (UTC+8) = 2026-11-23T06:00:00Z
    const passTimeMs = Date.UTC(2026, 10, 23, 6, 0, 0);
    assert.equal(getManilaDateKey(passTimeMs), '2026-11-23');

    // Next midnight in Asia/Manila = 2026-11-24 00:00:00 Manila = 2026-11-23T16:00:00Z
    const expectedMidnightMs = Date.UTC(2026, 10, 23, 16, 0, 0);
    assert.equal(getNextManilaMidnightMs(passTimeMs), expectedMidnightMs);

    // Failed previous topic (<75%)
    const failingStudent = makeStudent({
      progress: {
        'ionic-compounds': {
          passed: false,
          score: 70,
          bestScore: 70,
          attempts: 1,
          passedAtMs: null,
        },
      },
    });
    const t2NeedsScore = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: failingStudent,
      topicsSettings: null,
      nowMs: passTimeMs + 60_000,
    });
    assert.equal(t2NeedsScore.unlocked, false);
    assert.equal(t2NeedsScore.reason, 'needs-score');

    // Passed at 2:00 PM Manila -> locked at 2:30 PM Manila (9h 30m left)
    const passedStudent = makeStudent({
      progress: {
        'ionic-compounds': {
          passed: true,
          score: 83,
          bestScore: 83,
          attempts: 1,
          passedAtMs: passTimeMs,
        },
      },
    });
    const sameDayLater = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: passedStudent,
      topicsSettings: null,
      nowMs: passTimeMs + 30 * 60_000,
    });
    assert.equal(sameDayLater.unlocked, false);
    assert.equal(sameDayLater.reason, 'wait-next-day');
    assert.equal(sameDayLater.unlockAtMs, expectedMidnightMs);
    assert.equal(sameDayLater.lockLabel, 'Opens in 9h 30m');

    // Passed early morning (08:00 Manila = 00:00Z -> 16h until midnight) shows "Opens tomorrow"
    const earlyPassMs = Date.UTC(2026, 10, 23, 0, 0, 0);
    assert.equal(
      formatTopicWaitLabel(getNextManilaMidnightMs(earlyPassMs), earlyPassMs),
      'Opens tomorrow'
    );

    // At exactly 12:00 AM Manila next day -> unlocked!
    const afterMidnight = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: passedStudent,
      topicsSettings: null,
      nowMs: expectedMidnightMs,
    });
    assert.equal(afterMidnight.unlocked, true);
    assert.equal(afterMidnight.reason, 'unlocked');
  });

  it('holds next topic as awaiting-sync when passed offline without server timestamp', () => {
    const offlineStudent = makeStudent({
      progress: {
        'ionic-compounds': {
          passed: true,
          score: 90,
          bestScore: 90,
          attempts: 1,
          passedAtMs: null,
        },
      },
    });

    const t2 = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: offlineStudent,
      topicsSettings: null,
    });
    assert.equal(t2.unlocked, false);
    assert.equal(t2.reason, 'awaiting-sync');
  });

  it('enforces strict precedence: Teacher Lock ALWAYS beats Early Unlock and passed progress', () => {
    const passedMs = Date.UTC(2026, 10, 20, 0, 0, 0);
    const student = makeStudent({
      uid: 'u-123',
      section: '3F',
      progress: {
        'ionic-compounds': {
          passed: true,
          score: 100,
          bestScore: 100,
          attempts: 1,
          passedAtMs: passedMs,
        },
      },
    });

    // Both unlockedForEveryone AND lockedSections=['3f'] (case-insensitive) -> Locked wins!
    const settingsLockedSection = makeSettings({
      topics: {
        'polyatomic-ions': {
          unlockedForEveryone: true,
          unlockedStudentUids: ['u-123'],
          lockedSections: ['3f'],
        },
      },
    });

    const resSection = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: student,
      topicsSettings: settingsLockedSection,
      nowMs: passedMs + 7 * 24 * 3600_000,
    });
    assert.equal(resSection.unlocked, false);
    assert.equal(resSection.reason, 'teacher-locked');

    // Locked by student UID beats unlockedForEveryone
    const settingsLockedUid = makeSettings({
      topics: {
        'polyatomic-ions': {
          unlockedForEveryone: true,
          lockedStudentUids: ['u-123'],
        },
      },
    });
    const resUid = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: student,
      topicsSettings: settingsLockedUid,
      nowMs: passedMs + 7 * 24 * 3600_000,
    });
    assert.equal(resUid.unlocked, false);
    assert.equal(resUid.reason, 'teacher-locked');

    // Outside openAtMs schedule beats unlockedForEveryone
    const futureOpen = passedMs + 5 * 24 * 3600_000;
    const settingsFuture = makeSettings({
      topics: {
        'polyatomic-ions': {
          unlockedForEveryone: true,
          openAtMs: futureOpen,
        },
      },
    });
    const resFuture = evaluateTopicAccess('polyatomic-ions', {
      studentProfile: student,
      topicsSettings: settingsFuture,
      nowMs: futureOpen - 2 * 3600_000,
    });
    assert.equal(resFuture.unlocked, false);
    assert.equal(resFuture.reason, 'outside-schedule');
  });

  it('allows Teacher Early Unlock when not explicitly locked by teacher', () => {
    const freshStudent = makeStudent({ section: '3F' });
    const settings = makeSettings({
      topics: {
        'covalent-compounds': {
          unlockedSections: ['3F'],
        },
      },
    });

    const res = evaluateTopicAccess('covalent-compounds', {
      studentProfile: freshStudent,
      topicsSettings: settings,
    });
    assert.equal(res.unlocked, true);
    assert.equal(res.reason, 'teacher-unlocked');
  });

  it('tracks daily retries accurately in Asia/Manila day', () => {
    const nowMs = Date.UTC(2026, 10, 23, 6, 0, 0); // 2026-11-23 Manila
    const student = makeStudent({
      dailyRetries: {
        dateKey: '2026-11-23',
        counts: { 'ionic-compounds': 3 },
      },
    });

    const status = getDailyRetryStatus(student, 'ionic-compounds', 3, nowMs);
    assert.equal(status.limit, 3);
    assert.equal(status.usedToday, 3);
    assert.equal(status.remainingToday, 0);
    assert.equal(status.limitReached, true);

    // Next Manila day resets count to 0
    const tomorrowMs = Date.UTC(2026, 10, 23, 16, 5, 0); // 00:05 Nov 24 Manila
    const nextDayStatus = getDailyRetryStatus(student, 'ionic-compounds', 3, tomorrowMs);
    assert.equal(nextDayStatus.usedToday, 0);
    assert.equal(nextDayStatus.limitReached, false);
  });
});
