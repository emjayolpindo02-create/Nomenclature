import { PracticeProgress, SectionPolicySettings } from '../types/chemistry';

export interface StudentUser {
  username: string;
  fullName: string;
  section: string;
  mustChangePin: boolean;
}

export interface StudentSession {
  sessionToken: string;
  tokenExpiresAt: string;
  user: StudentUser;
}

export interface AttemptSubmissionPayload {
  attemptId: string;
  libraryId: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  questionIds: string[];
  missedQuestionIds: string[];
  clientSubmittedAt: string;
  wasQueuedOffline?: boolean;
}

export interface QueuedAttempt {
  attemptId: string;
  username: string;
  payload: AttemptSubmissionPayload;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
}

export const DEFAULT_SECTION_POLICY: SectionPolicySettings = {
  passingScore: 70,
  waitingTimeHours: 0,
  inactivityDays: 7,
  cooldownMinutes: 15,
  sessionExpiryDays: 60,
};

/**
 * Generates a unique, deterministic-safe ID for each submitted quiz attempt
 * so retries from the offline queue never create duplicate rows.
 */
export function createAttemptId(username: string, libraryId: string, timestampMs: number = Date.now()): string {
  const safeUser = username.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'student';
  const safeTopic = libraryId.replace(/[^a-z0-9-]/g, '').slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${safeUser}_${safeTopic}_${timestampMs}_${rand}`;
}

/**
 * Adds a queued attempt without ever creating duplicate entries for the same attemptId
 * or identical (username, libraryId, clientSubmittedAt).
 */
export function enqueueOfflineAttempt(
  queue: QueuedAttempt[],
  nextItem: QueuedAttempt
): QueuedAttempt[] {
  const alreadyExists = queue.some(
    (item) =>
      item.attemptId === nextItem.attemptId ||
      (item.username.toLowerCase() === nextItem.username.toLowerCase() &&
        item.payload.libraryId === nextItem.payload.libraryId &&
        item.payload.clientSubmittedAt === nextItem.payload.clientSubmittedAt)
  );
  if (alreadyExists) {
    return queue;
  }
  return [...queue, nextItem];
}

/**
 * Removes an attempt from the queue once synced (or confirmed duplicate by server).
 */
export function dequeueOfflineAttempt(queue: QueuedAttempt[], attemptId: string): QueuedAttempt[] {
  return queue.filter((item) => item.attemptId !== attemptId);
}

/**
 * Checks whether a saved session token is still valid and not expired.
 */
export function isSessionTokenValid(
  session: StudentSession | null,
  nowMs: number = Date.now()
): boolean {
  if (!session || !session.sessionToken || !session.user?.username) {
    return false;
  }
  if (!session.tokenExpiresAt) return true;
  const expMs = Date.parse(session.tokenExpiresAt);
  if (Number.isNaN(expMs)) return false;
  return expMs > nowMs;
}

/**
 * Computes a monotonic high-water timestamp so moving the device clock backward
 * is detected even across offline sessions.
 */
export function advanceClockHighWater(
  prevHighWaterMs: number | null,
  deviceNowMs: number,
  serverNowMs?: number | null
): number {
  const candidates = [prevHighWaterMs ?? 0, deviceNowMs];
  if (typeof serverNowMs === 'number' && !Number.isNaN(serverNowMs) && serverNowMs > 0) {
    candidates.push(serverNowMs);
  }
  return Math.max(...candidates);
}

/**
 * Detects whether the device clock appears to have moved backward relative to
 * previously observed monotonic time or an official server pass timestamp.
 */
export function isClockMovedBackward(
  deviceNowMs: number,
  highWaterMs: number | null,
  toleranceMs: number = 60_000
): boolean {
  if (typeof highWaterMs !== 'number' || highWaterMs <= 0) return false;
  return deviceNowMs < highWaterMs - toleranceMs;
}

/**
 * Merges locally cached progress with authoritative progress restored from Google Sheets.
 * Server officialPassDate, bestScore, and passed status take precedence for new-device restore.
 */
export function mergeProgressMaps(
  localMap: Record<string, PracticeProgress>,
  remoteMap: Record<string, PracticeProgress>
): Record<string, PracticeProgress> {
  const merged: Record<string, PracticeProgress> = { ...localMap };

  for (const [libId, remote] of Object.entries(remoteMap)) {
    const local = merged[libId];
    if (!local) {
      merged[libId] = {
        ...remote,
        submitted: true,
      };
      continue;
    }

    const officialDate = remote.officialPassDate || remote.passedDate || local.officialPassDate || local.passedDate || '';
    merged[libId] = {
      libraryId: libId,
      submitted: Boolean(remote.submitted || local.submitted),
      passed: Boolean(remote.passed || local.passed),
      bestScore: Math.max(remote.bestScore || 0, local.bestScore || 0),
      attempts: Math.max(remote.attempts || 0, local.attempts || 0),
      passedDate: officialDate,
      officialPassDate: officialDate,
      passedAt: remote.passedAt ?? local.passedAt ?? null,
      completedAt: remote.completedAt || local.completedAt,
    };
  }

  return merged;
}

export interface FlushResult {
  remainingQueue: QueuedAttempt[];
  syncedCount: number;
  latestProgressMap: Record<string, PracticeProgress> | null;
  latestUnlockOverrides: string[] | null;
  latestSettings: SectionPolicySettings | null;
  latestServerNowMs: number | null;
  sessionExpired: boolean;
  lastError: string | null;
}

export interface AttemptSubmitOutcome {
  ok: boolean;
  sessionExpired?: boolean;
  error?: string;
  progressMap?: Record<string, PracticeProgress>;
  unlockOverrides?: string[];
  settings?: SectionPolicySettings;
  serverNowIso?: string;
}

/**
 * Flushes queued offline attempts sequentially without duplicates or dropping failed items.
 */
export async function flushOfflineQueue(
  queue: QueuedAttempt[],
  username: string,
  submitFn: (payload: AttemptSubmissionPayload) => Promise<AttemptSubmitOutcome>
): Promise<FlushResult> {
  let workingQueue = [...queue];
  let syncedCount = 0;
  let latestProgressMap: Record<string, PracticeProgress> | null = null;
  let latestUnlockOverrides: string[] | null = null;
  let latestSettings: SectionPolicySettings | null = null;
  let latestServerNowMs: number | null = null;
  let sessionExpired = false;
  let lastError: string | null = null;

  const targetLower = username.trim().toLowerCase();

  for (const item of queue) {
    if (item.username.trim().toLowerCase() !== targetLower) {
      continue;
    }

    try {
      const outcome = await submitFn({
        ...item.payload,
        wasQueuedOffline: true,
      });

      if (outcome.ok) {
        workingQueue = dequeueOfflineAttempt(workingQueue, item.attemptId);
        syncedCount += 1;
        if (outcome.progressMap) latestProgressMap = outcome.progressMap;
        if (outcome.unlockOverrides) latestUnlockOverrides = outcome.unlockOverrides;
        if (outcome.settings) latestSettings = outcome.settings;
        if (outcome.serverNowIso) {
          const ms = Date.parse(outcome.serverNowIso);
          if (!Number.isNaN(ms)) latestServerNowMs = ms;
        }
      } else {
        lastError = outcome.error || 'Could not sync attempt.';
        if (outcome.sessionExpired) {
          sessionExpired = true;
          break;
        }
        workingQueue = workingQueue.map((q) =>
          q.attemptId === item.attemptId
            ? { ...q, retryCount: q.retryCount + 1, lastError: lastError ?? undefined }
            : q
        );
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error while syncing.';
      workingQueue = workingQueue.map((q) =>
        q.attemptId === item.attemptId
          ? { ...q, retryCount: q.retryCount + 1, lastError: lastError ?? undefined }
          : q
      );
      // Preserve remaining items when offline/network fails
      break;
    }
  }

  return {
    remainingQueue: workingQueue,
    syncedCount,
    latestProgressMap,
    latestUnlockOverrides,
    latestSettings,
    latestServerNowMs,
    sessionExpired,
    lastError,
  };
}
