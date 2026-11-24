import { TOPICS } from '../data/topics';
import {
  TopicDefinition,
  TopicId,
  TopicProgressEntry,
} from '../types/chemistry';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TopicLockReason =
  | 'unlocked'
  | 'needs-score'
  | 'wait-next-day';

export interface TopicAccessStatus {
  topicId: TopicId;
  unlocked: boolean;
  reason: TopicLockReason;
  previousTopicId: TopicId | null;
  previousTopicTitle: string | null;
  requiredScore: number;
  previousBestScore: number;
  passed: boolean;
  bestScore: number;
  passedAtMs: number | null;
  unlockAtMs: number | null;
  msUntilUnlock: number;
  lockLabel: string | null;
  countdownLabel: string | null;
}

export interface TopicAccessOptions {
  progressMap: Record<string, TopicProgressEntry>;
  nowMs?: number;
  minDelayHours?: number;
}

/**
 * Returns "YYYY-MM-DD" in Asia/Manila (UTC+8) without relying on runtime ICU locale tables.
 */
export function getManilaDateKey(ms: number = Date.now()): string {
  const shifted = new Date(ms + MANILA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the UTC timestamp (ms) of the next 12:00 AM (00:00:00) in Asia/Manila after `passedAtMs`.
 */
export function getNextManilaMidnightMs(passedAtMs: number): number {
  const shifted = passedAtMs + MANILA_OFFSET_MS;
  const nextMidnightShifted = Math.floor(shifted / DAY_MS) * DAY_MS + DAY_MS;
  return nextMidnightShifted - MANILA_OFFSET_MS;
}

/**
 * Formats milliseconds remaining into concise "5h 20m" or "18m".
 */
export function formatRemainingDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formats friendly unlock wait copy: "Opens tomorrow" or "Opens in 5h 20m".
 */
export function formatTopicWaitLabel(unlockAtMs: number, nowMs: number = Date.now()): string {
  const msRemaining = Math.max(0, unlockAtMs - nowMs);
  if (msRemaining <= 0) return 'Opens soon';

  const nowManilaDay = getManilaDateKey(nowMs);
  const unlockManilaDay = getManilaDateKey(unlockAtMs);

  if (unlockManilaDay > nowManilaDay && msRemaining > 10 * 3600_000) {
    return 'Opens tomorrow';
  }
  return `Opens in ${formatRemainingDuration(msRemaining)}`;
}

/**
 * Evaluates device-saved topic progression:
 * - Topic 1 is always unlocked.
 * - Topics 2–5 require >= 75% on the previous topic AND waiting until 12:00 AM Asia/Manila next day.
 */
export function evaluateTopicAccess(
  topicId: TopicId,
  options: TopicAccessOptions
): TopicAccessStatus {
  const topicIndex = TOPICS.findIndex((t) => t.id === topicId);
  const topic: TopicDefinition = TOPICS[topicIndex] || TOPICS[0];
  const prevTopic: TopicDefinition | null = topicIndex > 0 ? TOPICS[topicIndex - 1] : null;

  const nowMs = options.nowMs ?? Date.now();
  const progressMap = options.progressMap || {};
  const ownProg = progressMap[topic.id];
  const prevProg = prevTopic ? progressMap[prevTopic.id] : undefined;

  const baseStatus = {
    topicId: topic.id,
    previousTopicId: prevTopic ? prevTopic.id : null,
    previousTopicTitle: prevTopic ? prevTopic.title : null,
    requiredScore: prevTopic ? prevTopic.passingScore : topic.passingScore,
    previousBestScore: prevProg?.bestScore ?? 0,
    passed: Boolean(ownProg?.passed),
    bestScore: ownProg?.bestScore ?? 0,
    passedAtMs: ownProg?.passedAtMs ?? null,
  };

  if (!prevTopic || topic.order === 1) {
    return {
      ...baseStatus,
      unlocked: true,
      reason: 'unlocked',
      unlockAtMs: null,
      msUntilUnlock: 0,
      lockLabel: null,
      countdownLabel: null,
    };
  }

  const prevBest = prevProg?.bestScore ?? prevProg?.score ?? 0;
  const prevPassed = Boolean(prevProg?.passed && prevBest >= prevTopic.passingScore);

  if (!prevPassed) {
    return {
      ...baseStatus,
      unlocked: false,
      reason: 'needs-score',
      unlockAtMs: null,
      msUntilUnlock: 0,
      lockLabel: `Pass ${prevTopic.title} (≥${prevTopic.passingScore}%) to unlock`,
      countdownLabel: `Need ≥${prevTopic.passingScore}%`,
    };
  }

  const prevPassedAtMs = prevProg?.passedAtMs;
  if (typeof prevPassedAtMs !== 'number' || !Number.isFinite(prevPassedAtMs) || prevPassedAtMs <= 0) {
    return {
      ...baseStatus,
      unlocked: true,
      reason: 'unlocked',
      unlockAtMs: null,
      msUntilUnlock: 0,
      lockLabel: null,
      countdownLabel: null,
    };
  }

  let unlockAtMs = getNextManilaMidnightMs(prevPassedAtMs);
  if (typeof options.minDelayHours === 'number' && options.minDelayHours > 0) {
    unlockAtMs = Math.max(unlockAtMs, prevPassedAtMs + options.minDelayHours * 3600_000);
  }

  if (nowMs < unlockAtMs) {
    const msUntilUnlock = unlockAtMs - nowMs;
    const waitLabel = formatTopicWaitLabel(unlockAtMs, nowMs);
    return {
      ...baseStatus,
      unlocked: false,
      reason: 'wait-next-day',
      unlockAtMs,
      msUntilUnlock,
      lockLabel: waitLabel,
      countdownLabel: waitLabel,
    };
  }

  return {
    ...baseStatus,
    unlocked: true,
    reason: 'unlocked',
    unlockAtMs,
    msUntilUnlock: 0,
    lockLabel: null,
    countdownLabel: null,
  };
}
