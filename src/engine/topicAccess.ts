import { TOPICS } from '../data/topics';
import {
  StudentProfile,
  TopicDefinition,
  TopicId,
  TopicProgressEntry,
  TopicTeacherRule,
  TopicsSettingsDoc,
} from '../types/chemistry';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TopicLockReason =
  | 'unlocked'
  | 'teacher-unlocked'
  | 'teacher-locked'
  | 'outside-schedule'
  | 'blocked'
  | 'approval-required'
  | 'guest-locked'
  | 'needs-score'
  | 'awaiting-sync'
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
  studentProfile: StudentProfile | null;
  topicsSettings: TopicsSettingsDoc | null;
  guestProgress?: Record<string, TopicProgressEntry>;
  isTeacher?: boolean;
  nowMs?: number;
  /** Optional minimum hour delay override for testing; defaults to next 12:00 AM Asia/Manila */
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

  // If unlock is on the next calendar day and > 10 hours away, show "Opens tomorrow"
  if (unlockManilaDay > nowManilaDay && msRemaining > 10 * 3600_000) {
    return 'Opens tomorrow';
  }
  return `Opens in ${formatRemainingDuration(msRemaining)}`;
}

function normalizeSection(sec: string | undefined | null): string {
  return (sec || '').trim().toLowerCase();
}

function listIncludesSection(sections: string[] | undefined, studentSection: string): boolean {
  if (!Array.isArray(sections) || sections.length === 0 || !studentSection) return false;
  const target = normalizeSection(studentSection);
  return sections.some((s) => normalizeSection(s) === target);
}

function listIncludesUid(uids: string[] | undefined, uid: string): boolean {
  if (!Array.isArray(uids) || uids.length === 0 || !uid) return false;
  return uids.includes(uid);
}

function isRuleTeacherLocked(
  rule: TopicTeacherRule | undefined,
  uid: string,
  section: string,
  nowMs: number
): { locked: boolean; reason: 'teacher-locked' | 'outside-schedule' | null; label: string | null } {
  if (!rule) return { locked: false, reason: null, label: null };

  if (
    rule.lockedForEveryone ||
    listIncludesSection(rule.lockedSections, section) ||
    listIncludesUid(rule.lockedStudentUids, uid)
  ) {
    return {
      locked: true,
      reason: 'teacher-locked',
      label: 'Locked by your teacher',
    };
  }

  if (typeof rule.openAtMs === 'number' && rule.openAtMs > 0 && nowMs < rule.openAtMs) {
    return {
      locked: true,
      reason: 'outside-schedule',
      label: formatTopicWaitLabel(rule.openAtMs, nowMs),
    };
  }

  if (typeof rule.closeAtMs === 'number' && rule.closeAtMs > 0 && nowMs > rule.closeAtMs) {
    return {
      locked: true,
      reason: 'outside-schedule',
      label: 'Locked by your teacher (window closed)',
    };
  }

  return { locked: false, reason: null, label: null };
}

function isRuleTeacherUnlocked(
  rule: TopicTeacherRule | undefined,
  uid: string,
  section: string
): boolean {
  if (!rule) return false;
  return Boolean(
    rule.unlockedForEveryone ||
      listIncludesSection(rule.unlockedSections, section) ||
      listIncludesUid(rule.unlockedStudentUids, uid)
  );
}

/**
 * Evaluates exact topic access following precedence:
 * 1. Teacher viewing -> unlocked
 * 2. Blocked student -> locked
 * 3. Approved signed-in students:
 *    a. Teacher Lock (everyone / section / student / open-close schedule) -> ALWAYS WINS (locked)
 *    b. Teacher Early Unlock (everyone / section / student) -> unlocked immediately
 *    c. Automatic progression via Firestore progress (passedAtMs from serverTimestamp)
 * 4. Guests / unapproved students:
 *    - Automatic progression via local device progress (`guestProgress`): Topic 1 unlocked,
 *      passing (>= passingScore) starts wait until 12:00 AM Asia/Manila next day.
 */
export function evaluateTopicAccess(
  topicId: TopicId,
  options: TopicAccessOptions
): TopicAccessStatus {
  const topicIndex = TOPICS.findIndex((t) => t.id === topicId);
  const topic: TopicDefinition = TOPICS[topicIndex] || TOPICS[0];
  const prevTopic: TopicDefinition | null = topicIndex > 0 ? TOPICS[topicIndex - 1] : null;

  const nowMs = options.nowMs ?? Date.now();
  const profile = options.studentProfile;
  const isApprovedStudent = Boolean(profile && profile.approved);
  const progressMap: Record<string, TopicProgressEntry> = isApprovedStudent
    ? profile?.progress || {}
    : options.guestProgress ?? profile?.progress ?? {};
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

  if (options.isTeacher) {
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

  // Blocked students cannot access topics
  if (profile?.blocked) {
    return {
      ...baseStatus,
      unlocked: false,
      reason: 'blocked',
      unlockAtMs: null,
      msUntilUnlock: 0,
      lockLabel: 'Account paused by your teacher',
      countdownLabel: null,
    };
  }

  if (isApprovedStudent && profile) {
    const teacherRule: TopicTeacherRule | undefined =
      options.topicsSettings?.topics?.[topic.id];
    const studentUid = profile.uid || '';
    const studentSection = profile.section || '';

    // Rule 1 (Precedence #1): Teacher explicit lock or schedule ALWAYS wins
    const lockCheck = isRuleTeacherLocked(teacherRule, studentUid, studentSection, nowMs);
    if (lockCheck.locked) {
      return {
        ...baseStatus,
        unlocked: false,
        reason: lockCheck.reason || 'teacher-locked',
        unlockAtMs:
          lockCheck.reason === 'outside-schedule' && typeof teacherRule?.openAtMs === 'number'
            ? teacherRule.openAtMs
            : null,
        msUntilUnlock:
          lockCheck.reason === 'outside-schedule' && typeof teacherRule?.openAtMs === 'number'
            ? Math.max(0, teacherRule.openAtMs - nowMs)
            : 0,
        lockLabel: lockCheck.label || 'Locked by your teacher',
        countdownLabel: lockCheck.label,
      };
    }

    // Rule 2: Teacher early unlock opens immediately
    if (isRuleTeacherUnlocked(teacherRule, studentUid, studentSection)) {
      return {
        ...baseStatus,
        unlocked: true,
        reason: 'teacher-unlocked',
        unlockAtMs: null,
        msUntilUnlock: 0,
        lockLabel: null,
        countdownLabel: null,
      };
    }
  }

  // Rule 3: Automatic progression (applies to everyone — guests, unapproved, and approved students)
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

  const prevPassed = Boolean(
    prevProg?.passed && (prevProg.bestScore ?? prevProg.score ?? 0) >= prevTopic.passingScore
  );

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
      unlocked: false,
      reason: 'awaiting-sync',
      unlockAtMs: null,
      msUntilUnlock: 0,
      lockLabel: 'Saved offline — waiting to sync server unlock time',
      countdownLabel: 'Awaiting sync',
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

export interface RetryStatus {
  limit: number;
  usedToday: number;
  remainingToday: number | null;
  limitReached: boolean;
}

export function getDailyRetryStatus(
  studentProfile: StudentProfile | null,
  topicId: TopicId,
  maxRetriesPerDay: number | undefined,
  nowMs: number = Date.now()
): RetryStatus {
  const limit = typeof maxRetriesPerDay === 'number' && maxRetriesPerDay > 0 ? Math.floor(maxRetriesPerDay) : 0;
  if (!limit || !studentProfile || !studentProfile.approved) {
    return {
      limit: 0,
      usedToday: 0,
      remainingToday: null,
      limitReached: false,
    };
  }
  const todayKey = getManilaDateKey(nowMs);
  const usedToday =
    studentProfile.dailyRetries?.dateKey === todayKey
      ? Number(studentProfile.dailyRetries.counts?.[topicId] || 0)
      : 0;
  const remainingToday = Math.max(0, limit - usedToday);
  return {
    limit,
    usedToday,
    remainingToday,
    limitReached: usedToday >= limit,
  };
}
