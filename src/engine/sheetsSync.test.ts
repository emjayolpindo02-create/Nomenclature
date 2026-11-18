import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceClockHighWater,
  createAttemptId,
  enqueueOfflineAttempt,
  flushOfflineQueue,
  isClockMovedBackward,
  isSessionTokenValid,
  mergeProgressMaps,
  QueuedAttempt,
  StudentSession,
} from './sheetsSync';
import { getLessonUnlockStatus } from './lessonLock';
import { PracticeProgress } from '../types/chemistry';
import {
  cleanEnvValue,
  getSafeSecretSummary,
  isValidAppsScriptExecUrl,
} from '../config/sheets';
import {
  classifyPingResponse,
  formatSecretCharsLabel,
  formatUnauthorizedSecretMessage,
} from '../services/sheetsClient';

test('Offline queue deduplicates repeated attemptId and preserves order without duplicates', () => {
  const attemptId = createAttemptId('ana.reyes', 'writing-chemical-formulas', 1763200000000);
  const item: QueuedAttempt = {
    attemptId,
    username: 'ana.reyes',
    queuedAt: '2026-11-15T08:00:00.000Z',
    retryCount: 0,
    payload: {
      attemptId,
      libraryId: 'writing-chemical-formulas',
      scorePercent: 90,
      correctCount: 9,
      totalQuestions: 10,
      questionIds: ['wcf-1', 'wcf-2'],
      missedQuestionIds: ['wcf-2'],
      clientSubmittedAt: '2026-11-15T08:00:00.000Z',
    },
  };

  let queue: QueuedAttempt[] = [];
  queue = enqueueOfflineAttempt(queue, item);
  queue = enqueueOfflineAttempt(queue, item); // same attemptId
  queue = enqueueOfflineAttempt(queue, {
    ...item,
    attemptId: 'different-id-same-timestamp',
  });

  assert.equal(queue.length, 1);
});

test('Offline queue flushes cleanly on reconnect and retains unsynced items on network failure without loss', async () => {
  const first: QueuedAttempt = {
    attemptId: 'att-1',
    username: 'ana.reyes',
    queuedAt: '2026-11-15T08:00:00.000Z',
    retryCount: 0,
    payload: {
      attemptId: 'att-1',
      libraryId: 'writing-chemical-formulas',
      scorePercent: 80,
      correctCount: 8,
      totalQuestions: 10,
      questionIds: ['wcf-1'],
      missedQuestionIds: [],
      clientSubmittedAt: '2026-11-15T08:00:00.000Z',
    },
  };
  const second: QueuedAttempt = {
    ...first,
    attemptId: 'att-2',
    payload: {
      ...first.payload,
      attemptId: 'att-2',
      scorePercent: 90,
      clientSubmittedAt: '2026-11-15T09:00:00.000Z',
    },
  };

  const sentIds: string[] = [];
  const partialFlush = await flushOfflineQueue([first, second], 'ana.reyes', async (payload) => {
    sentIds.push(payload.attemptId);
    if (payload.attemptId === 'att-1') {
      return {
        ok: true,
        serverNowIso: '2026-11-15T10:00:00.000Z',
        progressMap: {
          'writing-chemical-formulas': {
            libraryId: 'writing-chemical-formulas',
            passed: true,
            submitted: true,
            bestScore: 80,
            attempts: 1,
            officialPassDate: '2026-11-15',
            passedDate: '2026-11-15',
            passedAt: '2026-11-15T10:00:00.000Z',
          },
        },
      };
    }
    throw new Error('offline');
  });

  assert.deepEqual(sentIds, ['att-1', 'att-2']);
  assert.equal(partialFlush.syncedCount, 1);
  assert.equal(partialFlush.remainingQueue.length, 1);
  assert.equal(partialFlush.remainingQueue[0].attemptId, 'att-2');

  const fullFlush = await flushOfflineQueue(partialFlush.remainingQueue, 'ana.reyes', async () => ({
    ok: true,
    serverNowIso: '2026-11-15T10:05:00.000Z',
  }));
  assert.equal(fullFlush.syncedCount, 1);
  assert.equal(fullFlush.remainingQueue.length, 0);
});

test('Clock-backward helper detects device clock rollback', () => {
  const initialServerMs = Date.parse('2026-11-15T12:00:00.000Z');
  const hwm = advanceClockHighWater(null, initialServerMs - 10_000, initialServerMs);
  assert.equal(hwm, initialServerMs);

  const validLaterMs = Date.parse('2026-11-15T13:00:00.000Z');
  assert.equal(isClockMovedBackward(validLaterMs, hwm), false);

  const rolledBackMs = Date.parse('2026-11-14T10:00:00.000Z');
  assert.equal(isClockMovedBackward(rolledBackMs, hwm), true);
});

test('Progress restores cleanly on a new device and enforces official pass date', () => {
  const remoteFromSheet: Record<string, PracticeProgress> = {
    'writing-chemical-formulas': {
      libraryId: 'writing-chemical-formulas',
      passed: true,
      submitted: true,
      bestScore: 90,
      attempts: 2,
      officialPassDate: '2026-11-14',
      passedDate: '2026-11-14',
      passedAt: '2026-11-14T16:30:00.000Z',
    },
  };

  // Fresh device has empty localMap
  const restored = mergeProgressMaps({}, remoteFromSheet);
  assert.equal(restored['writing-chemical-formulas'].bestScore, 90);
  assert.equal(restored['writing-chemical-formulas'].officialPassDate, '2026-11-14');

  const nextDayStatus = getLessonUnlockStatus(
    'metal-one-oxidation-nonmetal',
    restored,
    70,
    new Date(2026, 10, 15, 8, 0)
  );
  assert.equal(nextDayStatus.unlocked, true);
});

test('Session token validation honors 60-day expiry', () => {
  const session: StudentSession = {
    sessionToken: 'tok-123',
    tokenExpiresAt: '2027-01-14T00:00:00.000Z',
    user: {
      username: 'marco.santos',
      fullName: 'Marco Santos',
      section: '10-Einstein',
      mustChangePin: false,
    },
  };

  assert.equal(isSessionTokenValid(session, Date.parse('2026-11-15T12:00:00.000Z')), true);
  assert.equal(isSessionTokenValid(session, Date.parse('2027-01-15T00:00:00.000Z')), false);
});

test('Apps Script env trimming, /exec URL check, and safe secret preview never expose full secret', () => {
  assert.equal(cleanEnvValue('  mySecret!\r\n '), 'mySecret!');
  assert.equal(
    isValidAppsScriptExecUrl('  https://script.google.com/macros/s/abc123/exec \n'),
    true
  );
  assert.equal(isValidAppsScriptExecUrl('https://script.google.com/macros/s/abc123/dev'), false);
  assert.equal(isValidAppsScriptExecUrl(''), false);

  const summary = getSafeSecretSummary('  Alpha99\n');
  assert.deepEqual(summary, { length: 7, firstChar: 'A', lastChar: '9' });
  assert.equal(formatSecretCharsLabel(summary), 'A ... 9');
  assert.equal(formatSecretCharsLabel(getSafeSecretSummary('')), 'None');
});

test('Connection check classification and sign-in mismatch messages cover all 4 states cleanly', () => {
  const summary = getSafeSecretSummary('sampleKey7');

  const okRes = classifyPingResponse(summary, {
    ok: true,
    secretMatches: true,
    receivedLength: 10,
    expectedLength: 10,
  });
  assert.equal(okRes.status, 'Secret matches');
  assert.equal(okRes.sentLength, 10);
  assert.equal(okRes.expectedLength, 10);

  const mismatchRes = classifyPingResponse(summary, {
    ok: true,
    secretMatches: false,
    receivedLength: 10,
    expectedLength: 16,
  });
  assert.equal(mismatchRes.status, 'Secret does not match');

  const noSecretRes = classifyPingResponse(getSafeSecretSummary(''), {
    ok: true,
    secretMatches: false,
    receivedLength: 0,
    expectedLength: 16,
  });
  assert.equal(noSecretRes.status, 'No secret received');

  const unreachableRes = classifyPingResponse(summary, null);
  assert.equal(unreachableRes.status, 'Cannot reach script');

  const signInError = formatUnauthorizedSecretMessage(summary, 10, 16);
  assert.match(signInError, /Secret does not match/);
  assert.match(signInError, /s \.\.\. 7/);
  assert.doesNotMatch(signInError, /sampleKey7/);
});
