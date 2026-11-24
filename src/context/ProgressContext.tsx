import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  QueuedTopicResult,
  TopicId,
  TopicProgressEntry,
} from '../types/chemistry';
import { TOPICS } from '../data/topics';
import {
  evaluateTopicAccess,
  getManilaDateKey,
  TopicAccessStatus,
} from '../engine/topicAccess';
import {
  computeRetryDelayMs,
  formatResultDateTimeParts,
  isSheetsConfigured,
  sendResult,
  sendResultsBatch,
} from '../services/sheetsClient';
import { useStudent } from './StudentContext';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';

const LOCAL_PROGRESS_KEY = 'ilab_topic_progress_v1';
const LEGACY_GUEST_PROGRESS_KEY = 'ilab_guest_topic_progress_v1';
const SHEETS_QUEUE_KEY = 'ilab_sheets_result_queue_v1';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface SubmitTopicAttemptInput {
  topicId: TopicId;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
}

export interface SubmitTopicAttemptResult {
  status: 'saved' | 'queued' | 'local-only';
  passed: boolean;
  newBadges: Badge[];
  message?: string;
}

export interface SyncFlushOutcome {
  ok: boolean;
  offline?: boolean;
  unconfigured?: boolean;
  syncedCount: number;
  remainingCount: number;
  message: string;
}

interface ProgressContextType {
  progressMap: Record<string, TopicProgressEntry>;
  queuedResults: QueuedTopicResult[];
  isFlushingQueue: boolean;
  lastSyncError: string | null;
  lastSyncSuccessAt: string | null;
  sheetsConfigured: boolean;
  submitTopicAttempt: (input: SubmitTopicAttemptInput) => Promise<SubmitTopicAttemptResult>;
  flushResultsQueueNow: (manual?: boolean) => Promise<SyncFlushOutcome>;
  getTopicAccess: (topicId: TopicId) => TopicAccessStatus;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  badges: Badge[];
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function loadLocalProgress(): Record<string, TopicProgressEntry> {
  try {
    const raw = safeGetItem(LOCAL_PROGRESS_KEY) ?? safeGetItem(LEGACY_GUEST_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, TopicProgressEntry>;
  } catch {
    return {};
  }
}

function saveLocalProgress(progress: Record<string, TopicProgressEntry>): void {
  try {
    safeSetItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // safeStorage handles fallback
  }
}

function loadQueuedResults(): QueuedTopicResult[] {
  try {
    const raw = safeGetItem(SHEETS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedTopicResult[]) : [];
  } catch {
    return [];
  }
}

function buildBadges(progressMap: Record<string, TopicProgressEntry>): Badge[] {
  const prog = progressMap || {};
  const isPassed = (id: TopicId) => Boolean(prog[id]?.passed);
  const hasPerfect = Object.values(prog).some((p) => (p.bestScore ?? p.score ?? 0) >= 100);

  return [
    {
      id: 'badge-ionic',
      name: 'Ionic Builder',
      description: 'Passed Ionic Compounds with at least 75%',
      icon: '⚡',
      unlocked: isPassed('ionic-compounds'),
    },
    {
      id: 'badge-poly',
      name: 'Polyatomic Master',
      description: 'Passed Polyatomic Ions with at least 75%',
      icon: '💎',
      unlocked: isPassed('polyatomic-ions'),
    },
    {
      id: 'badge-covalent',
      name: 'Prefix Specialist',
      description: 'Passed Covalent Compounds with at least 75%',
      icon: '🔬',
      unlocked: isPassed('covalent-compounds'),
    },
    {
      id: 'badge-acids',
      name: 'Acid Analyst',
      description: 'Passed Acids with at least 75%',
      icon: '🧪',
      unlocked: isPassed('acids'),
    },
    {
      id: 'badge-mixed',
      name: 'Nomenclature Champion',
      description: 'Passed Mixed Practice across all rules',
      icon: '🏆',
      unlocked: isPassed('mixed-practice'),
    },
    {
      id: 'badge-perfect',
      name: 'Flawless Precision',
      description: 'Scored 100% on any topic practice',
      icon: '⭐',
      unlocked: hasPerfect,
    },
  ];
}

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { studentIdentity } = useStudent();
  const sheetsConfigured = isSheetsConfigured();

  const [progressMap, setProgressMap] = useState<Record<string, TopicProgressEntry>>(() =>
    loadLocalProgress()
  );
  const [queuedResults, setQueuedResults] = useState<QueuedTopicResult[]>(() =>
    loadQueuedResults()
  );
  const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncSuccessAt, setLastSyncSuccessAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const flushingRef = useRef<boolean>(false);
  const retryTimerRef = useRef<number | null>(null);
  const queueRef = useRef<QueuedTopicResult[]>(queuedResults);
  queueRef.current = queuedResults;

  const saveQueue = useCallback((next: QueuedTopicResult[]) => {
    queueRef.current = next;
    setQueuedResults(next);
    try {
      if (next.length === 0) {
        safeRemoveItem(SHEETS_QUEUE_KEY);
      } else {
        safeSetItem(SHEETS_QUEUE_KEY, JSON.stringify(next));
      }
    } catch {
      // safeStorage handles fallback
    }
  }, []);

  // Tick every 30s so 12:00 AM Asia/Manila unlocks activate automatically
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const flushResultsQueueNow = useCallback(
    async (manual: boolean = false): Promise<SyncFlushOutcome> => {
      const currentQueue = queueRef.current;

      if (!sheetsConfigured) {
        return {
          ok: true,
          unconfigured: true,
          syncedCount: 0,
          remainingCount: currentQueue.length,
          message: 'Saved locally (Google Sheets sync is not configured).',
        };
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
          ok: false,
          offline: true,
          syncedCount: 0,
          remainingCount: currentQueue.length,
          message: 'Offline — queued results will sync automatically when connected.',
        };
      }

      if (flushingRef.current) {
        return {
          ok: true,
          syncedCount: 0,
          remainingCount: currentQueue.length,
          message: 'Sync already in progress...',
        };
      }

      if (currentQueue.length === 0) {
        if (manual) {
          setLastSyncError(null);
          setLastSyncSuccessAt(new Date().toISOString());
        }
        return {
          ok: true,
          syncedCount: 0,
          remainingCount: 0,
          message: 'All results are already synced.',
        };
      }

      flushingRef.current = true;
      setIsFlushingQueue(true);
      setLastSyncError(null);

      try {
        const snapshotQueue = [...queueRef.current];
        const res = await sendResultsBatch(snapshotQueue);

        if (res.ok) {
          const syncedIds = new Set(snapshotQueue.map((item) => item.queueId));
          const remaining = queueRef.current.filter((item) => !syncedIds.has(item.queueId));
          saveQueue(remaining);
          setLastSyncSuccessAt(new Date().toISOString());
          return {
            ok: true,
            syncedCount: snapshotQueue.length,
            remainingCount: remaining.length,
            message: `Synced ${snapshotQueue.length} result${snapshotQueue.length === 1 ? '' : 's'} to Google Sheets.`,
          };
        }

        const errMsg = res.error || 'Could not reach Google Sheets right now.';
        setLastSyncError(errMsg);

        // Bump retry count and schedule with backoff + jitter
        const updatedQueue = queueRef.current.map((item) => {
          const wasAttempted = snapshotQueue.some((s) => s.queueId === item.queueId);
          if (!wasAttempted) return item;
          const nextRetryCount = (item.retryCount || 0) + 1;
          return {
            ...item,
            retryCount: nextRetryCount,
            nextRetryAtMs: Date.now() + computeRetryDelayMs(nextRetryCount),
          };
        });
        saveQueue(updatedQueue);

        return {
          ok: false,
          offline: res.offline,
          unconfigured: res.unconfigured,
          syncedCount: 0,
          remainingCount: updatedQueue.length,
          message: errMsg,
        };
      } finally {
        flushingRef.current = false;
        setIsFlushingQueue(false);
      }
    },
    [sheetsConfigured, saveQueue]
  );

  // Automatic retry scheduler with exponential backoff + random jitter, plus online listener
  useEffect(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!sheetsConfigured || queuedResults.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const earliestTargetMs = Math.min(
      ...queuedResults.map((item) =>
        typeof item.nextRetryAtMs === 'number' && item.nextRetryAtMs > 0
          ? item.nextRetryAtMs
          : Date.now() + computeRetryDelayMs(item.retryCount || 0)
      )
    );
    const delayMs = Math.max(500, earliestTargetMs - Date.now());

    retryTimerRef.current = window.setTimeout(() => {
      void flushResultsQueueNow(false);
    }, delayMs);

    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [sheetsConfigured, queuedResults, flushResultsQueueNow]);

  useEffect(() => {
    const onOnline = () => {
      if (!sheetsConfigured || queueRef.current.length === 0) return;
      // Add slight random jitter on reconnect so classrooms don't spike simultaneously
      const jitterMs = Math.round(500 + Math.random() * 2_500);
      window.setTimeout(() => {
        void flushResultsQueueNow(false);
      }, jitterMs);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sheetsConfigured, flushResultsQueueNow]);

  const submitTopicAttempt = useCallback(
    async (input: SubmitTopicAttemptInput): Promise<SubmitTopicAttemptResult> => {
      const topicDef = TOPICS.find((t) => t.id === input.topicId);
      const requiredScore = topicDef?.passingScore ?? 75;
      const roundedScore = Math.min(100, Math.max(0, Math.round(input.scorePercent)));
      const passed = roundedScore >= requiredScore;
      const nowTimestampMs = Date.now();
      const prevBadges = buildBadges(progressMap);

      // 1. Always save locally right away (75% passing score + 12:00 AM Asia/Manila unlock)
      const existing = progressMap[input.topicId];
      const nextPassed = Boolean(existing?.passed || passed);
      const existingPassedAt =
        typeof existing?.passedAtMs === 'number' && existing.passedAtMs > 0
          ? existing.passedAtMs
          : null;
      const nextPassedAtMs = existingPassedAt ?? (passed ? nowTimestampMs : null);
      const nowDateKey = getManilaDateKey(nowTimestampMs);

      const nextProgressMap: Record<string, TopicProgressEntry> = {
        ...progressMap,
        [input.topicId]: {
          passed: nextPassed,
          score: roundedScore,
          bestScore: Math.max(existing?.bestScore ?? 0, roundedScore),
          attempts: (existing?.attempts ?? 0) + 1,
          passedAtMs: nextPassedAtMs,
          passedAtIso: nextPassedAtMs ? new Date(nextPassedAtMs).toISOString() : null,
          passedDateManila: existing?.passedDateManila || (passed ? nowDateKey : null),
          completedAtIso: new Date(nowTimestampMs).toISOString(),
        },
      };
      setProgressMap(nextProgressMap);
      saveLocalProgress(nextProgressMap);

      const currBadges = buildBadges(nextProgressMap);
      const newBadges = currBadges.filter(
        (b) => b.unlocked && !prevBadges.find((p) => p.id === b.id)?.unlocked
      );

      // 2. If Google Sheets env vars are empty, sync is cleanly turned off with no errors
      if (!sheetsConfigured) {
        return {
          status: 'local-only',
          passed,
          newBadges,
          message: 'Saved on this device (Google Sheets sync is off).',
        };
      }

      // 3. Build single completion result payload and send (or queue with jittered retry if offline/failed)
      const dtParts = formatResultDateTimeParts(nowTimestampMs);
      const resultId = `${input.topicId}_${nowTimestampMs}_${Math.random().toString(36).slice(2, 7)}`;
      const studentName = studentIdentity?.fullName?.trim() || 'Student';
      const studentSection = studentIdentity?.section?.trim() || '-';
      const topicTitle = topicDef?.title || input.topicId;

      const queueEntry: QueuedTopicResult = {
        queueId: resultId,
        name: studentName,
        section: studentSection,
        topicId: input.topicId,
        topic: topicTitle,
        score: roundedScore,
        correctCount: input.correctCount,
        totalQuestions: input.totalQuestions,
        passed: passed ? 'yes' : 'no',
        date: dtParts.date,
        time: dtParts.time,
        dateTime: dtParts.dateTime,
        retryCount: 0,
        nextRetryAtMs: nowTimestampMs + computeRetryDelayMs(0),
      };

      const isOfflineNow =
        typeof navigator !== 'undefined' && navigator.onLine === false;

      if (isOfflineNow) {
        saveQueue([...queueRef.current, queueEntry]);
        return {
          status: 'queued',
          passed,
          newBadges,
          message: 'Saved on this device — queued in localStorage and will sync automatically when online.',
        };
      }

      const sendRes = await sendResult({
        resultId: queueEntry.queueId,
        name: queueEntry.name,
        section: queueEntry.section,
        topicId: queueEntry.topicId,
        topic: queueEntry.topic,
        score: queueEntry.score,
        correctCount: queueEntry.correctCount,
        totalQuestions: queueEntry.totalQuestions,
        passed: queueEntry.passed,
        date: queueEntry.date,
        time: queueEntry.time,
        dateTime: queueEntry.dateTime,
      });

      if (sendRes.ok) {
        setLastSyncError(null);
        setLastSyncSuccessAt(new Date().toISOString());
        return {
          status: 'saved',
          passed,
          newBadges,
          message: 'Saved on this device and synced to Google Sheets.',
        };
      }

      saveQueue([...queueRef.current, queueEntry]);
      setLastSyncError(sendRes.error || 'Queued to sync later.');
      return {
        status: 'queued',
        passed,
        newBadges,
        message: 'Saved on this device — sync queued and will retry automatically.',
      };
    },
    [progressMap, sheetsConfigured, studentIdentity, saveQueue]
  );

  const getTopicAccess = useCallback(
    (topicId: TopicId): TopicAccessStatus => {
      return evaluateTopicAccess(topicId, {
        progressMap,
        nowMs,
      });
    },
    [progressMap, nowMs]
  );

  const isTopicUnlocked = useCallback(
    (topicId: TopicId): boolean => getTopicAccess(topicId).unlocked,
    [getTopicAccess]
  );

  const badges = buildBadges(progressMap);

  return (
    <ProgressContext.Provider
      value={{
        progressMap,
        queuedResults,
        isFlushingQueue,
        lastSyncError,
        lastSyncSuccessAt,
        sheetsConfigured,
        submitTopicAttempt,
        flushResultsQueueNow,
        getTopicAccess,
        isTopicUnlocked,
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
