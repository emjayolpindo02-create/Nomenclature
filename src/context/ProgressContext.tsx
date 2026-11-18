import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PracticeProgress } from '../types/chemistry';
import { PRACTICE_SETS } from '../data/practiceQuestions';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import { SHEETS_CONFIG } from '../config/sheets';
import {
  getLessonUnlockStatus,
  LessonUnlockStatus,
} from '../engine/lessonLock';
import {
  AttemptSubmissionPayload,
  createAttemptId,
  enqueueOfflineAttempt,
  flushOfflineQueue,
  mergeProgressMaps,
  QueuedAttempt,
  StudentSession,
} from '../engine/sheetsSync';
import { saveStudentAttempt } from '../services/sheetsClient';

const LEGACY_PROGRESS_KEY = 'compound_naming_guide_progress_v1';
const QUEUE_STORAGE_KEY = 'ilab_attempt_queue_v1';

function getProgressStorageKey(username: string): string {
  return `ilab_progress_v3_${username.toLowerCase()}`;
}

function getOverridesStorageKey(username: string): string {
  return `ilab_overrides_v3_${username.toLowerCase()}`;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface SubmitPracticeInput {
  libraryId: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  questionIds: string[];
  missedQuestionIds: string[];
  overrideSession?: StudentSession;
}

export interface SubmitPracticeResult {
  status: 'synced' | 'queued' | 'unsubmitted';
  passed: boolean;
  officialPassDate?: string;
  newBadges: Badge[];
  message?: string;
}

interface ProgressContextType {
  progressMap: Record<string, PracticeProgress>;
  unlockOverrides: string[];
  queuedAttempts: QueuedAttempt[];
  isSyncingQueue: boolean;
  progressLoading: boolean;
  submitPracticeAttempt: (input: SubmitPracticeInput) => Promise<SubmitPracticeResult>;
  syncOfflineQueueNow: () => Promise<void>;
  isLibraryUnlocked: (libraryId: string) => boolean;
  getUnlockStatus: (libraryId: string) => LessonUnlockStatus;
  getPreviousLibraryTitle: (libraryId: string) => string | null;
  resetLocalProgressCache: () => void;
  badges: Badge[];
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function loadQueue(): QueuedAttempt[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const {
    session,
    user,
    sectionPolicy,
    clockHighWaterMs,
    remoteSync,
    applyRemoteSyncData,
    handleExpiredSession,
  } = useAuth();

  const [progressMap, setProgressMap] = useState<Record<string, PracticeProgress>>({});
  const [unlockOverrides, setUnlockOverrides] = useState<string[]>([]);
  const [queuedAttempts, setQueuedAttempts] = useState<QueuedAttempt[]>(() => loadQueue());
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());

  const saveQueue = useCallback((nextQueue: QueuedAttempt[]) => {
    setQueuedAttempts(nextQueue);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
    } catch {
      // ignore
    }
  }, []);

  // Refresh clock every 30s so next-day unlocks activate automatically when midnight passes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clean up legacy unscoped progress key
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Hydrate user-scoped local progress & overrides when active user changes
  useEffect(() => {
    if (!user?.username) {
      setProgressMap({});
      setUnlockOverrides([]);
      setProgressLoading(false);
      return;
    }

    try {
      const cached = localStorage.getItem(getProgressStorageKey(user.username));
      setProgressMap(cached ? JSON.parse(cached) : {});
    } catch {
      setProgressMap({});
    }

    try {
      const cachedOverrides = localStorage.getItem(getOverridesStorageKey(user.username));
      setUnlockOverrides(cachedOverrides ? JSON.parse(cachedOverrides) : []);
    } catch {
      setUnlockOverrides([]);
    }
  }, [user?.username]);

  // Apply authoritative progress & overrides whenever remoteSync updates from Google Sheets
  useEffect(() => {
    if (!remoteSync || !user?.username) return;
    if (remoteSync.username.toLowerCase() !== user.username.toLowerCase()) return;

    if (remoteSync.progressMap) {
      setProgressMap((prev) => {
        const merged = mergeProgressMaps(prev, remoteSync.progressMap || {});
        try {
          localStorage.setItem(getProgressStorageKey(user.username), JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    }

    if (remoteSync.unlockOverrides) {
      setUnlockOverrides(remoteSync.unlockOverrides);
      try {
        localStorage.setItem(
          getOverridesStorageKey(user.username),
          JSON.stringify(remoteSync.unlockOverrides)
        );
      } catch {
        // ignore
      }
    }
  }, [remoteSync, user?.username]);

  const calculateBadges = useCallback((map: Record<string, PracticeProgress>): Badge[] => {
    const isPassed = (id: string) => Boolean(map[id]?.submitted && map[id]?.passed);
    const hasPerfect = Object.values(map).some((p) => p.submitted && p.bestScore >= 100);

    return [
      {
        id: 'badge-wcf',
        name: 'Formula Architect',
        description: 'Mastered Writing Chemical Formulas & Criss-Cross',
        icon: '📐',
        unlocked: isPassed('writing-chemical-formulas'),
      },
      {
        id: 'badge-binary',
        name: 'Binary Specialist',
        description: 'Completed both Single & Variable Metal Binary rules',
        icon: '⚔️',
        unlocked:
          isPassed('metal-one-oxidation-nonmetal') &&
          isPassed('metal-variable-oxidation-nonmetal'),
      },
      {
        id: 'badge-covalent',
        name: 'Covalent Master',
        description: 'Mastered Greek prefixes & Nonmetal naming',
        icon: '🔬',
        unlocked: isPassed('nonmetal-nonmetal'),
      },
      {
        id: 'badge-acids',
        name: 'Acid Prodigy',
        description: 'Mastered both Binary and Ternary Oxyacids',
        icon: '🧪',
        unlocked:
          isPassed('hydrogen-halogen-binary-acids') &&
          isPassed('hydrogen-polyatomic-ternary-acids'),
      },
      {
        id: 'badge-poly',
        name: 'Polyatomic Alchemist',
        description: 'Conquered complex Polyatomic salts',
        icon: '💎',
        unlocked:
          isPassed('metal-one-oxidation-polyatomic') &&
          isPassed('metal-variable-oxidation-polyatomic'),
      },
      {
        id: 'badge-mixed',
        name: 'Nomenclature Champion',
        description: 'Passed the Final Mixed Review',
        icon: '🏆',
        unlocked: isPassed('final-mixed-review'),
      },
      {
        id: 'badge-perfect',
        name: 'Flawless Precision',
        description: 'Scored 100% on any submitted practice set',
        icon: '⭐',
        unlocked: hasPerfect,
      },
    ];
  }, []);

  const syncOfflineQueueNow = useCallback(async () => {
    if (!session || isSyncingQueue) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const studentPending = queuedAttempts.filter(
      (q) => q.username.toLowerCase() === session.user.username.toLowerCase()
    );
    if (studentPending.length === 0) return;

    setIsSyncingQueue(true);
    try {
      const result = await flushOfflineQueue(
        queuedAttempts,
        session.user.username,
        async (payload) => {
          return saveStudentAttempt(session.sessionToken, payload);
        }
      );

      saveQueue(result.remainingQueue);

      if (result.sessionExpired) {
        handleExpiredSession(result.lastError || undefined);
        return;
      }

      if (result.latestProgressMap || result.latestSettings || result.latestUnlockOverrides) {
        applyRemoteSyncData({
          username: session.user.username,
          progressMap: result.latestProgressMap || undefined,
          unlockOverrides: result.latestUnlockOverrides || undefined,
          settings: result.latestSettings || undefined,
          serverNowIso: result.latestServerNowMs
            ? new Date(result.latestServerNowMs).toISOString()
            : undefined,
        });
      }
    } finally {
      setIsSyncingQueue(false);
    }
  }, [
    session,
    isSyncingQueue,
    queuedAttempts,
    saveQueue,
    handleExpiredSession,
    applyRemoteSyncData,
  ]);

  // Auto-flush offline queue when signed in or when connection restores
  useEffect(() => {
    if (!session) return;
    void syncOfflineQueueNow();

    const onOnline = () => {
      void syncOfflineQueueNow();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [session?.sessionToken, syncOfflineQueueNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitPracticeAttempt = async (
    input: SubmitPracticeInput
  ): Promise<SubmitPracticeResult> => {
    const activeSession = input.overrideSession || session;
    const effectivePassingScore =
      sectionPolicy.passingScore || settings.passingScore || 70;
    const roundedScore = Math.min(100, Math.max(0, Math.round(input.scorePercent)));
    const passed = roundedScore >= effectivePassingScore;

    // Guest users cannot persist or unlock topics with unsubmitted scores
    if (!activeSession) {
      return {
        status: 'unsubmitted',
        passed,
        newBadges: [],
        message: 'Sign in with your username and PIN to submit this score.',
      };
    }

    const username = activeSession.user.username;
    const attemptId = createAttemptId(username, input.libraryId);
    const payload: AttemptSubmissionPayload = {
      attemptId,
      libraryId: input.libraryId,
      scorePercent: roundedScore,
      correctCount: input.correctCount,
      totalQuestions: input.totalQuestions,
      questionIds: input.questionIds,
      missedQuestionIds: input.missedQuestionIds,
      clientSubmittedAt: new Date().toISOString(),
    };

    const prevBadges = calculateBadges(progressMap);

    try {
      const res = await saveStudentAttempt(activeSession.sessionToken, payload);
      if (!res.ok) {
        if (res.sessionExpired) {
          handleExpiredSession(res.error);
          return {
            status: 'unsubmitted',
            passed,
            newBadges: [],
            message: res.error || 'Session expired. Sign in again to submit this attempt.',
          };
        }
        throw new Error(res.error || 'Could not submit score.');
      }

      const nextMap = mergeProgressMaps(progressMap, res.progressMap || {});
      setProgressMap(nextMap);
      try {
        localStorage.setItem(getProgressStorageKey(username), JSON.stringify(nextMap));
      } catch {
        // ignore
      }

      applyRemoteSyncData({
        username,
        progressMap: nextMap,
        unlockOverrides: res.unlockOverrides,
        settings: res.settings,
        serverNowIso: res.serverNowIso,
      });

      const currBadges = calculateBadges(nextMap);
      const newBadges = currBadges.filter(
        (b) => b.unlocked && !prevBadges.find((pb) => pb.id === b.id)?.unlocked
      );

      return {
        status: 'synced',
        passed,
        officialPassDate:
          res.officialPassDate || nextMap[input.libraryId]?.officialPassDate,
        newBadges,
      };
    } catch {
      // Offline or unreachable Apps Script: queue cleanly with deduplication
      const queuedItem: QueuedAttempt = {
        attemptId,
        username,
        payload: { ...payload, wasQueuedOffline: true },
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      };
      const nextQueue = enqueueOfflineAttempt(queuedAttempts, queuedItem);
      saveQueue(nextQueue);

      // Update local best score & attempt count, WITHOUT setting officialPassDate (stays awaiting-sync until server records official date)
      const prevEntry = progressMap[input.libraryId];
      const nextEntry: PracticeProgress = {
        libraryId: input.libraryId,
        submitted: true,
        passed: Boolean(prevEntry?.passed || passed),
        bestScore: Math.max(prevEntry?.bestScore || 0, roundedScore),
        attempts: (prevEntry?.attempts || 0) + 1,
        passedDate: prevEntry?.passedDate || '',
        officialPassDate: prevEntry?.officialPassDate || '',
        passedAt: prevEntry?.passedAt || null,
        completedAt: new Date().toISOString(),
      };
      const nextMap = { ...progressMap, [input.libraryId]: nextEntry };
      setProgressMap(nextMap);
      try {
        localStorage.setItem(getProgressStorageKey(username), JSON.stringify(nextMap));
      } catch {
        // ignore
      }

      const currBadges = calculateBadges(nextMap);
      const newBadges = currBadges.filter(
        (b) => b.unlocked && !prevBadges.find((pb) => pb.id === b.id)?.unlocked
      );

      return {
        status: 'queued',
        passed,
        newBadges,
        message:
          'Saved to offline queue. Your official pass date will sync automatically once connected.',
      };
    }
  };

  const resetLocalProgressCache = () => {
    setProgressMap({});
    if (user?.username) {
      try {
        localStorage.removeItem(getProgressStorageKey(user.username));
        localStorage.removeItem(getOverridesStorageKey(user.username));
      } catch {
        // ignore
      }
    }
  };

  const getPreviousLibraryTitle = (libraryId: string): string | null => {
    const idx = PRACTICE_SETS.findIndex((p) => p.id === libraryId);
    if (idx <= 0) return null;
    return PRACTICE_SETS[idx - 1].title;
  };

  const effectiveRequiredScore = sectionPolicy.passingScore || settings.passingScore || 70;

  const getUnlockStatus = (libraryId: string): LessonUnlockStatus => {
    return getLessonUnlockStatus(libraryId, progressMap, effectiveRequiredScore, now, {
      waitingTimeHours: sectionPolicy.waitingTimeHours,
      unlockOverrides,
      highWaterNowMs: clockHighWaterMs,
      clockDriftToleranceMs: SHEETS_CONFIG.clockDriftToleranceMs,
    });
  };

  const isLibraryUnlocked = (libraryId: string): boolean => {
    return getUnlockStatus(libraryId).unlocked;
  };

  const badges = calculateBadges(progressMap);

  return (
    <ProgressContext.Provider
      value={{
        progressMap,
        unlockOverrides,
        queuedAttempts: user
          ? queuedAttempts.filter(
              (q) => q.username.toLowerCase() === user.username.toLowerCase()
            )
          : [],
        isSyncingQueue,
        progressLoading,
        submitPracticeAttempt,
        syncOfflineQueueNow,
        isLibraryUnlocked,
        getUnlockStatus,
        getPreviousLibraryTitle,
        resetLocalProgressCache,
        badges,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside a ProgressProvider');
  return ctx;
};
