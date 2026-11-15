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
  | 'wait-next-day';

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
 * Extracts a YYYY-MM-DD local date key from a PracticeProgress record.
 */
export function getPassedDateKey(prog: PracticeProgress | undefined): string | null {
  if (!prog || !prog.passed) return null;
  if (prog.passedDate && /^\d{4}-\d{2}-\d{2}$/.test(prog.passedDate)) {
    return prog.passedDate;
  }
  if (prog.completedAt) {
    const parsed = new Date(prog.completedAt);
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
 * 1. Acquiring at least `requiredScore` on the previous lesson's practice set.
 * 2. Waiting until the next calendar day arrives after passing the previous lesson.
 */
export function getLessonUnlockStatus(
  lessonId: string,
  progressMap: Record<string, PracticeProgress>,
  requiredScore: number = 70,
  now: Date = new Date()
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
  const hasAcquiredScore = !!prevProg?.passed && prevBestScore >= requiredScore;

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

  const passedDate = getPassedDateKey(prevProg);
  // If somehow marked passed without any date, treat as passed today so it cannot bypass the next-day gate
  const effectivePassedDate = passedDate || getLocalDateKey(now);
  const unlockDate = getNextCalendarDayKey(effectivePassedDate);
  const todayKey = getLocalDateKey(now);

  if (todayKey >= unlockDate) {
    return {
      unlocked: true,
      reason: 'unlocked',
      previousId: prev.id,
      previousTitle: prev.title,
      requiredScore,
      previousBestScore: prevBestScore,
      passedDate: effectivePassedDate,
      unlockDate,
      msUntilUnlock: 0,
      countdownLabel: null,
    };
  }

  const msUntilUnlock = getMsUntilDateKey(unlockDate, now);

  return {
    unlocked: false,
    reason: 'wait-next-day',
    previousId: prev.id,
    previousTitle: prev.title,
    requiredScore,
    previousBestScore: prevBestScore,
    passedDate: effectivePassedDate,
    unlockDate,
    msUntilUnlock,
    countdownLabel: formatCountdown(msUntilUnlock),
  };
}
