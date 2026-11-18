import { PracticeProgress } from '../types/chemistry';

export interface CurriculumItem {
  id: string;
  title: string;
  isFinalReview?: boolean;
}

export const CURRICULUM_SEQUENCE: CurriculumItem[] = [
  { id: 'writing-chemical-formulas', title: 'Writing Chemical Formulas' },
  { id: 'metal-one-oxidation-nonmetal', title: 'Metal with One Oxidation Number + Nonmetal' },
  { id: 'metal-variable-oxidation-nonmetal', title: 'Metal with Variable Oxidation Number + Nonmetal' },
  { id: 'nonmetal-nonmetal', title: 'Nonmetal + Nonmetal' },
  { id: 'hydrogen-halogen-binary-acids', title: 'Hydrogen + Halogen (Binary Acids)' },
  { id: 'metal-one-oxidation-polyatomic', title: 'Metal with One Oxidation Number + Polyatomic Ion' },
  { id: 'metal-variable-oxidation-polyatomic', title: 'Metal with Variable Oxidation Number + Polyatomic Ion' },
  { id: 'hydrogen-polyatomic-ternary-acids', title: 'Hydrogen + Polyatomic Ion (Ternary Acids)' },
  { id: 'final-mixed-review', title: 'Final Mixed Review', isFinalReview: true },
];

export type LockReason =
  | 'unlocked'
  | 'needs-score'
  | 'wait-next-day'
  | 'awaiting-sync'
  | 'clock-backward';

export interface LessonUnlockStatus {
  unlocked: boolean;
  reason: LockReason;
  previousId: string | null;
  previousTitle: string | null;
  requiredScore: number;
  previousBestScore: number;
  passedDate: string | null;
  unlockDate: string | null;
  msUntilUnlock: number;
  countdownLabel: string | null;
}

export interface UnlockEvaluationOptions {
  waitingTimeHours?: number;
  unlockOverrides?: string[];
  highWaterNowMs?: number | null;
  clockDriftToleranceMs?: number;
}

/**
 * Formats a Date as a local calendar date key "YYYY-MM-DD".
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Given a "YYYY-MM-DD" date key, returns the next calendar day "YYYY-MM-DD".
 */
export function getNextCalendarDayKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return dateKey;
  }
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Extracts an official YYYY-MM-DD date key from a submitted PracticeProgress record.
 */
export function getPassedDateKey(prog: PracticeProgress | undefined): string | null {
  if (!prog || !prog.passed || !prog.submitted) return null;
  const candidate = prog.officialPassDate || prog.passedDate;
  if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }
  if (prog.passedAt) {
    const parsed = new Date(prog.passedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateKey(parsed);
    }
  }
  return null;
}

/**
 * Computes milliseconds from `now` until 00:00:00 local time on `unlockDateKey`.
 */
export function getMsUntilDateKey(unlockDateKey: string, now: Date = new Date()): number {
  const parts = unlockDateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}

/**
 * Formats milliseconds into a friendly countdown label like "14h 22m" or "18m".
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.ceil(ms / 60000);
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
 * Formats a YYYY-MM-DD key into a readable short label like "Nov 15, 2026".
 */
export function formatReadableDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Determines whether a lesson or practice set is unlocked based on:
 * 1. Explicit teacher override (`unlockOverrides`).
 * 2. Monotonic clock-backward protection (`highWaterNowMs` & `passedAt`).
 * 3. A SUBMITTED score >= `requiredScore` on the previous lesson.
 * 4. Official server pass date + arrival of the next calendar day (and optional `waitingTimeHours`).
 */
export function getLessonUnlockStatus(
  lessonId: string,
  progressMap: Record<string, PracticeProgress>,
  requiredScore: number = 70,
  now: Date = new Date(),
  options: UnlockEvaluationOptions = {}
): LessonUnlockStatus {
  const idx = CURRICULUM_SEQUENCE.findIndex((item) => item.id === lessonId);

  // First item (Writing Chemical Formulas) is always unlocked
  if (idx <= 0) {
    return {
      unlocked: true,
      reason: 'unlocked',
      previousId: null,
      previousTitle: null,
      requiredScore,
      previousBestScore: 0,
      passedDate: null,
      unlockDate: null,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  const prev = CURRICULUM_SEQUENCE[idx - 1];
  const prevProg = progressMap[prev.id];
  const prevBestScore = prevProg?.bestScore ?? 0;

  // Teacher manual override unlocks immediately
  if (options.unlockOverrides?.includes(lessonId)) {
    return {
      unlocked: true,
      reason: 'unlocked',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate: getPassedDateKey(prevProg),
      unlockDate: null,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  // Unsubmitted scores never unlock the next topic
  const isSubmitted = prevProg?.submitted === true;
  const hasAcquiredScore =
    isSubmitted && !!prevProg?.passed && prevBestScore >= requiredScore;

  if (!hasAcquiredScore) {
    return {
      unlocked: false,
      reason: 'needs-score',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate: null,
      unlockDate: null,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  // Require an official server pass date before unlocking tomorrow
  const passedDate = getPassedDateKey(prevProg);
  if (!passedDate) {
    return {
      unlocked: false,
      reason: 'awaiting-sync',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate: null,
      unlockDate: null,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  const tolerance = options.clockDriftToleranceMs ?? 60_000;
  const nowMs = now.getTime();
  const todayKey = getLocalDateKey(now);

  // Detect backward device clock manipulation
  const passedAtMs = prevProg?.passedAt ? Date.parse(prevProg.passedAt) : NaN;
  const movedBeforeHighWater =
    typeof options.highWaterNowMs === 'number' &&
    options.highWaterNowMs > 0 &&
    nowMs < options.highWaterNowMs - tolerance;
  const movedBeforePassTime =
    !Number.isNaN(passedAtMs) && nowMs < passedAtMs - tolerance;
  const movedBeforePassDay = todayKey < passedDate;

  if (movedBeforeHighWater || movedBeforePassTime || movedBeforePassDay) {
    const unlockDate = getNextCalendarDayKey(passedDate);
    return {
      unlocked: false,
      reason: 'clock-backward',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate,
      unlockDate,
      msUntilUnlock: Math.max(
        getMsUntilDateKey(unlockDate, now),
        options.highWaterNowMs ? options.highWaterNowMs - nowMs : 0
      ),
      countdownLabel: 'Clock check required',
    };
  }

  const unlockDate = getNextCalendarDayKey(passedDate);
  const waitingHours = Math.max(0, options.waitingTimeHours ?? 0);
  const waitHoursTargetMs =
    waitingHours > 0 && !Number.isNaN(passedAtMs)
      ? passedAtMs + waitingHours * 3600_000
      : 0;

  const calendarUnlocked = todayKey >= unlockDate;
  const hoursUnlocked = waitHoursTargetMs === 0 || nowMs >= waitHoursTargetMs;

  if (calendarUnlocked && hoursUnlocked) {
    return {
      unlocked: true,
      reason: 'unlocked',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate,
      unlockDate,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  const msUntilCalendar = getMsUntilDateKey(unlockDate, now);
  const msUntilHours = waitHoursTargetMs > 0 ? Math.max(0, waitHoursTargetMs - nowMs) : 0;
  const msUntilUnlock = Math.max(msUntilCalendar, msUntilHours);

  return {
    unlocked: false,
    reason: 'wait-next-day',
    previousId: prev.id,
    previousTitle: prev.title,
    requiredScore,
    previousBestScore: prevBestScore,
    passedDate,
    unlockDate,
    msUntilUnlock,
    countdownLabel: formatCountdown(msUntilUnlock),
  };
}
