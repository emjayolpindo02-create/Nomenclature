import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  mergeQueuedAttemptLists,
  QueuedAttempt,
  StudentSession,
} from '../engine/sheetsSync';
import { saveStudentAttempt } from '../services/sheetsClient';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';
import {
  readOfflineRecord,
  removeOfflineRecord,
  writeOfflineRecord,
} from '../utils/offlineDb';

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

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'offline' | 'error';
  message: string;
  updatedAtMs: number;
}

interface ProgressContextType {
  progressMap: Record<string, PracticeProgress>;
  unlockOverrides: string[];
  queuedAttempts: QueuedAttempt[];
  isSyncingQueue: boolean;
  lastSyncError: string | null;
  syncStatus: SyncStatus | null;
  progressLoading: boolean;
  submitPracticeAttempt: (input: SubmitPracticeInput) => Promise<SubmitPracticeResult>;
  syncOfflineQueueNow: () => Promise<void>;
  manualSyncNow: () => Promise<void>;
  clearSyncStatus: () => void;
  isLibraryUnlocked: (libraryId: string) => boolean;
  getUnlockStatus: (libraryId: string) => LessonUnlockStatus;
  getPreviousLibraryTitle: (libraryId: string) => string | null;
  resetLocalProgressCache: () => void;
  badges: Badge[];
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function loadQueue(): QueuedAttempt[] {
  try {
    const raw = safeGetItem(QUEUE_STORAGE_KEY);
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
    refreshSessionFromServer,
    handleExpiredSession,
  } = useAuth();

  const [progressMap, setProgressMap] = useState<Record<string, PracticeProgress>>({});
  const [unlockOverrides, setUnlockOverrides] = useState<string[]>([]);
  const [queuedAttempts, setQueuedAttempts] = useState<QueuedAttempt[]>(() => loadQueue());
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());

  const isSyncingRef = useRef<boolean>(false);
  const queuedAttemptsRef = useRef<QueuedAttempt[]>(queuedAttempts);
  queuedAttemptsRef.current = queuedAttempts;
  const progressMapRef = useRef<Record<string, PracticeProgress>>(progressMap);
  progressMapRef.current = progressMap;
  const syncNoticeTimerRef = useRef<number | null>(null);

  const publishSyncStatus = useCallback(
    (state: SyncStatus['state'], message: string, autoClearMs?: number) => {
      if (syncNoticeTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(syncNoticeTimerRef.current);
        syncNoticeTimerRef.current = null;
      }
      setSyncStatus({ state, message, updatedAtMs: Date.now() });
      if (autoClearMs && typeof window !== 'undefined') {
        syncNoticeTimerRef.current = window.setTimeout(() => {
          setSyncStatus(null);
          syncNoticeTimerRef.current = null;
        }, autoClearMs);
      }
    },
    []
  );

  const clearSyncStatus = useCallback(() => {
    if (syncNoticeTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(syncNoticeTimerRef.current);
      syncNoticeTimerRef.current = null;
    }
    setSyncStatus(null);
  }, []);

  const persistProgressForUser = useCallback(
    (username: string, map: Record<string, PracticeProgress>) => {
      const key = getProgressStorageKey(username);
      safeSetItem(key, JSON.stringify(map));
      void writeOfflineRecord(key, map);
    },
    []
  );

  const persistOverridesForUser = useCallback((username: string, overrides: string[]) => {
    const key = getOverridesStorageKey(username);
    safeSetItem(key, JSON.stringify(overrides));
    void writeOfflineRecord(key, overrides);
  }, []);

  const saveQueue = useCallback((nextQueue: QueuedAttempt[]) => {
    queuedAttemptsRef.current = nextQueue;
    setQueuedAttempts(nextQueue);
    safeSetItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
    void writeOfflineRecord(QUEUE_STORAGE_KEY, nextQueue);
  }, []);

  // Reconcile IndexedDB and localStorage for queued attempts on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const idbQueue = await readOfflineRecord<QueuedAttempt[]>(QUEUE_STORAGE_KEY);
      if (cancelled) return;
      const localQueue = queuedAttemptsRef.current;
      if (Array.isArray(idbQueue) && idbQueue.length > 0) {
        const merged = mergeQueuedAttemptLists(localQueue, idbQueue);
        saveQueue(merged);
      } else if (localQueue.length > 0) {
        void writeOfflineRecord(QUEUE_STORAGE_KEY, localQueue);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saveQueue]);

  // Refresh clock every 30s so next-day unlocks activate automatically when midnight passes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => {
      clearInterval(interval);
      if (syncNoticeTimerRef.current !== null) {
        window.clearTimeout(syncNoticeTimerRef.current);
      }
    };
  }, []);

  // Clean up legacy unscoped progress key
  useEffect(() => {
    safeRemoveItem(LEGACY_PROGRESS_KEY);
  }, []);

  // Hydrate user-scoped local progress & overrides from localStorage + IndexedDB when active user changes
  useEffect(() => {
    if (!user?.username) {
      setProgressMap({});
      setUnlockOverrides([]);
      setProgressLoading(false);
      return;
    }

    const activeUsername = user.username;
    const progressKey = getProgressStorageKey(activeUsername);
    const overridesKey = getOverridesStorageKey(activeUsername);

    let initialMap: Record<string, PracticeProgress> = {};
    try {
      const cached = safeGetItem(progressKey);
      initialMap = cached ? JSON.parse(cached) : {};
    } catch {
      initialMap = {};
    }
    setProgressMap(initialMap);

    let initialOverrides: string[] = [];
    try {
      const cachedOverrides = safeGetItem(overridesKey);
      initialOverrides = cachedOverrides ? JSON.parse(cachedOverrides) : [];
    } catch {
      initialOverrides = [];
    }
    setUnlockOverrides(initialOverrides);

    let cancelled = false;
    void (async () => {
      const [idbMap, idbOverrides] = await Promise.all([
        readOfflineRecord<Record<string, PracticeProgress>>(progressKey),
        readOfflineRecord<string[]>(overridesKey),
      ]);
      if (cancelled) return;

      if (idbMap && typeof idbMap === 'object' && Object.keys(idbMap).length > 0) {
        setProgressMap((prev) => {
          const merged = mergeProgressMaps(idbMap, prev);
          persistProgressForUser(activeUsername, merged);
          return merged;
        });
      } else if (Object.keys(initialMap).length > 0) {
        void writeOfflineRecord(progressKey, initialMap);
      }

      if (Array.isArray(idbOverrides) && idbOverrides.length > 0) {
        setUnlockOverrides((prev) => {
          const combined = Array.from(new Set([...prev, ...idbOverrides]));
          persistOverridesForUser(activeUsername, combined);
          return combined;
        });
      } else if (initialOverrides.length > 0) {
        void writeOfflineRecord(overridesKey, initialOverrides);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.username, persistProgressForUser, persistOverridesForUser]);

  // Apply authoritative progress & overrides whenever remoteSync updates from Google Sheets
  useEffect(() => {
    if (!remoteSync || !user?.username) return;
    if (remoteSync.username.toLowerCase() !== user.username.toLowerCase()) return;

    if (remoteSync.progressMap) {
      setProgressMap((prev) => {
        const merged = mergeProgressMaps(prev, remoteSync.progressMap || {});
        persistProgressForUser(user.username, merged);
        return merged;
      });
    }

    if (remoteSync.unlockOverrides) {
      setUnlockOverrides(remoteSync.unlockOverrides);
      persistOverridesForUser(user.username, remoteSync.unlockOverrides);
    }
  }, [remoteSync, user?.username, persistProgressForUser, persistOverridesForUser]);

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

  const reconcileLocalStores = useCallback(
    async (activeUsername?: string): Promise<QueuedAttempt[]> => {
      const idbQueue = await readOfflineRecord<QueuedAttempt[]>(QUEUE_STORAGE_KEY);
      let mergedQueue = queuedAttemptsRef.current;
      if (Array.isArray(idbQueue) && idbQueue.length > 0) {
        mergedQueue = mergeQueuedAttemptLists(mergedQueue, idbQueue);
        saveQueue(mergedQueue);
      } else if (mergedQueue.length > 0) {
        void writeOfflineRecord(QUEUE_STORAGE_KEY, mergedQueue);
      }

      if (activeUsername) {
        const progressKey = getProgressStorageKey(activeUsername);
        const overridesKey = getOverridesStorageKey(activeUsername);
        const [idbMap, idbOverrides] = await Promise.all([
          readOfflineRecord<Record<string, PracticeProgress>>(progressKey),
          readOfflineRecord<string[]>(overridesKey),
        ]);

        if (idbMap && typeof idbMap === 'object' && Object.keys(idbMap).length > 0) {
          const mergedMap = mergeProgressMaps(idbMap, progressMapRef.current);
          setProgressMap(mergedMap);
          persistProgressForUser(activeUsername, mergedMap);
        } else if (Object.keys(progressMapRef.current).length > 0) {
          void writeOfflineRecord(progressKey, progressMapRef.current);
        }

        if (Array.isArray(idbOverrides) && idbOverrides.length > 0) {
          setUnlockOverrides((prev) => {
            const combined = Array.from(new Set([...prev, ...idbOverrides]));
            persistOverridesForUser(activeUsername, combined);
            return combined;
          });
        }
      }

      return mergedQueue;
    },
    [saveQueue, persistProgressForUser, persistOverridesForUser]
  );

  const syncOfflineQueueNow = useCallback(async () => {
    if (!session || isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const reconciledQueue = await reconcileLocalStores(session.user.username);
    const studentPending = reconciledQueue.filter(
      (q) => q.username.toLowerCase() === session.user.username.toLowerCase()
    );
    if (studentPending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncingQueue(true);
    setLastSyncError(null);
    try {
      const result = await flushOfflineQueue(
        reconciledQueue,
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

      if (result.lastError && result.lastError !== 'offline') {
        setLastSyncError(result.lastError);
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
      isSyncingRef.current = false;
      setIsSyncingQueue(false);
    }
  }, [session, reconcileLocalStores, saveQueue, handleExpiredSession, applyRemoteSyncData]);

  const manualSyncNow = useCallback(async () => {
    if (isSyncingRef.current) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      publishSyncStatus(
        'offline',
        'Offline — your progress and queued scores stay saved locally.',
        5000
      );
      return;
    }

    isSyncingRef.current = true;
    setIsSyncingQueue(true);
    setLastSyncError(null);
    publishSyncStatus('syncing', 'Checking connection and syncing...');

    try {
      const reconciledQueue = await reconcileLocalStores(session?.user?.username);

      if (!session) {
        publishSyncStatus(
          'offline',
          'Online — local progress backed up. Sign in to sync with Google Sheets.',
          5500
        );
        return;
      }

      const studentPending = reconciledQueue.filter(
        (q) => q.username.toLowerCase() === session.user.username.toLowerCase()
      );

      let syncedCount = 0;
      let flushError: string | null = null;
      let gotProgressFromFlush = false;

      if (studentPending.length > 0) {
        const result = await flushOfflineQueue(
          reconciledQueue,
          session.user.username,
          async (payload) => {
            return saveStudentAttempt(session.sessionToken, payload);
          }
        );

        saveQueue(result.remainingQueue);
        syncedCount = result.syncedCount;

        if (result.sessionExpired) {
          handleExpiredSession(result.lastError || undefined);
          publishSyncStatus(
            'error',
            result.lastError || 'Your session expired. Sign in again to sync.'
          );
          return;
        }

        if (result.lastError) {
          flushError = result.lastError;
        }

        if (result.latestProgressMap || result.latestSettings || result.latestUnlockOverrides) {
          gotProgressFromFlush = true;
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
      }

      const refreshResult = await refreshSessionFromServer();

      if (refreshResult.sessionExpired) {
        publishSyncStatus(
          'error',
          refreshResult.error || 'Your session expired. Sign in again to sync.'
        );
        return;
      }

      if (flushError === 'offline' || refreshResult.error === 'offline') {
        publishSyncStatus(
          'offline',
          'Could not reach Google Sheets right now — data remains safely saved locally.',
          5000
        );
        return;
      }

      const errMsg =
        flushError || (!refreshResult.ok && !gotProgressFromFlush ? refreshResult.error : null);

      if (errMsg) {
        setLastSyncError(errMsg);
        publishSyncStatus('error', errMsg);
        return;
      }

      const successText =
        syncedCount > 0
          ? `Synced ${syncedCount} pending score${syncedCount === 1 ? '' : 's'} with Google Sheets.`
          : 'Synced with Google Sheets. Local state is up to date.';
      publishSyncStatus('success', successText, 4500);
    } finally {
      isSyncingRef.current = false;
      setIsSyncingQueue(false);
    }
  }, [
    session,
    reconcileLocalStores,
    saveQueue,
    handleExpiredSession,
    applyRemoteSyncData,
    refreshSessionFromServer,
    publishSyncStatus,
  ]);

  const syncOfflineQueueRef = useRef(syncOfflineQueueNow);
  syncOfflineQueueRef.current = syncOfflineQueueNow;

  // Auto-flush offline queue when signed in or when connection restores
  useEffect(() => {
    if (!session?.sessionToken) return;
    void syncOfflineQueueRef.current();

    const onOnline = () => {
      void syncOfflineQueueRef.current();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [session?.sessionToken]);

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
      persistProgressForUser(username, nextMap);
      setLastSyncError(null);

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
    } catch (err) {
      // Offline or unreachable Apps Script: queue cleanly with deduplication
      const rawErrMsg = err instanceof Error ? err.message : '';
      const isOfflineErr =
        rawErrMsg === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (!isOfflineErr && rawErrMsg) {
        setLastSyncError(rawErrMsg);
      }

      const queuedItem: QueuedAttempt = {
        attemptId,
        username,
        payload: { ...payload, wasQueuedOffline: true },
        queuedAt: new Date().toISOString(),
        retryCount: 0,
        lastError: !isOfflineErr && rawErrMsg ? rawErrMsg : undefined,
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
      persistProgressForUser(username, nextMap);

      const currBadges = calculateBadges(nextMap);
      const newBadges = currBadges.filter(
        (b) => b.unlocked && !prevBadges.find((pb) => pb.id === b.id)?.unlocked
      );

      return {
        status: 'queued',
        passed,
        newBadges,
        message:
          !isOfflineErr && rawErrMsg
            ? `Saved as Pending. ${rawErrMsg}`
            : 'Saved. Will send when online',
      };
    }
  };

  const resetLocalProgressCache = () => {
    setProgressMap({});
    if (user?.username) {
      const progressKey = getProgressStorageKey(user.username);
      const overridesKey = getOverridesStorageKey(user.username);
      safeRemoveItem(progressKey);
      safeRemoveItem(overridesKey);
      void removeOfflineRecord(progressKey);
      void removeOfflineRecord(overridesKey);
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
        lastSyncError,
        syncStatus,
        progressLoading,
        submitPracticeAttempt,
        syncOfflineQueueNow,
        manualSyncNow,
        clearSyncStatus,
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
