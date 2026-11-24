import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  QueuedTopicCompletion,
  TopicId,
  TopicProgressEntry,
  TopicsSettingsDoc,
} from '../types/chemistry';
import { TOPICS } from '../data/topics';
import {
  evaluateTopicAccess,
  getDailyRetryStatus,
  RetryStatus,
  TopicAccessStatus,
} from '../engine/topicAccess';
import {
  DEFAULT_TOPICS_SETTINGS,
  recordTopicCompletion,
  subscribeToTopicsSettings,
} from '../services/firebaseService';
import { useAuth } from './AuthContext';
import { isFirebaseReady } from '../config/firebase';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';

const TOPICS_SETTINGS_CACHE_KEY = 'ilab_topics_settings_v1';
const TOPIC_QUEUE_KEY = 'ilab_topic_completion_queue_v1';
const GUEST_PROGRESS_KEY = 'ilab_guest_topic_progress_v1';

function getLocalProgressKey(uid: string | undefined | null): string {
  return uid ? `ilab_local_unapproved_${uid}` : GUEST_PROGRESS_KEY;
}

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
  status: 'saved' | 'queued' | 'guest-local';
  passed: boolean;
  newBadges: Badge[];
  message?: string;
}

interface ProgressContextType {
  topicsSettings: TopicsSettingsDoc;
  queuedCompletions: QueuedTopicCompletion[];
  isFlushingQueue: boolean;
  lastSyncError: string | null;
  submitTopicAttempt: (input: SubmitTopicAttemptInput) => Promise<SubmitTopicAttemptResult>;
  flushCompletionQueueNow: () => Promise<void>;
  getTopicAccess: (topicId: TopicId) => TopicAccessStatus;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  getTopicRetryStatus: (topicId: TopicId) => RetryStatus;
  badges: Badge[];
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function loadCachedTopicsSettings(): TopicsSettingsDoc {
  try {
    const raw = safeGetItem(TOPICS_SETTINGS_CACHE_KEY);
    if (!raw) return DEFAULT_TOPICS_SETTINGS;
    return { ...DEFAULT_TOPICS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TOPICS_SETTINGS;
  }
}

function loadQueuedCompletions(): QueuedTopicCompletion[] {
  try {
    const raw = safeGetItem(TOPIC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalProgress(storageKey: string): Record<string, TopicProgressEntry> {
  try {
    const raw = safeGetItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, TopicProgressEntry>;
  } catch {
    return {};
  }
}

function saveLocalProgress(
  storageKey: string,
  progress: Record<string, TopicProgressEntry>
): void {
  try {
    safeSetItem(storageKey, JSON.stringify(progress));
  } catch {
    // safeStorage handles errors gracefully
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
  const { firebaseUser, studentProfile, isTeacher } = useAuth();
  const isApprovedStudent = Boolean(firebaseUser && studentProfile && studentProfile.approved);
  const localProgressKey = getLocalProgressKey(
    firebaseUser && (!studentProfile || !studentProfile.approved) ? firebaseUser.uid : null
  );

  const [topicsSettings, setTopicsSettings] = useState<TopicsSettingsDoc>(() =>
    loadCachedTopicsSettings()
  );
  const [localProgress, setLocalProgress] = useState<Record<string, TopicProgressEntry>>(() =>
    loadLocalProgress(localProgressKey)
  );
  const [queuedCompletions, setQueuedCompletions] = useState<QueuedTopicCompletion[]>(() =>
    loadQueuedCompletions()
  );
  const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const flushingRef = useRef<boolean>(false);
  const queueRef = useRef<QueuedTopicCompletion[]>(queuedCompletions);
  queueRef.current = queuedCompletions;

  // Reload device-local progress whenever the active local key changes (guest vs unapproved uid)
  useEffect(() => {
    setLocalProgress(loadLocalProgress(localProgressKey));
  }, [localProgressKey]);

  const saveQueue = useCallback((next: QueuedTopicCompletion[]) => {
    queueRef.current = next;
    setQueuedCompletions(next);
    try {
      if (next.length === 0) {
        safeRemoveItem(TOPIC_QUEUE_KEY);
      } else {
        safeSetItem(TOPIC_QUEUE_KEY, JSON.stringify(next));
      }
    } catch {
      // safeStorage handles fallback
    }
  }, []);

  // Tick every 30s so scheduled/midnight unlocks activate automatically
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Live subscription to teacher-controlled settings/topics when signed in
  useEffect(() => {
    if (!firebaseUser || !isFirebaseReady()) return;
    const unsub = subscribeToTopicsSettings(
      (docSettings) => {
        setTopicsSettings(docSettings);
        try {
          safeSetItem(TOPICS_SETTINGS_CACHE_KEY, JSON.stringify(docSettings));
        } catch {
          // ignore
        }
      },
      () => {
        // Fallback smoothly to cached settings when offline
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // Auto-flush queued completions when connection returns for approved student
  const flushCompletionQueueNow = useCallback(async () => {
    if (flushingRef.current) return;
    if (!firebaseUser || !studentProfile?.approved || studentProfile.blocked) return;
    if (!isFirebaseReady()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const uid = firebaseUser.uid;
    const forStudent = queueRef.current.filter((item) => item.uid === uid);
    if (forStudent.length === 0) return;

    flushingRef.current = true;
    setIsFlushingQueue(true);
    setLastSyncError(null);
    const remaining = [...queueRef.current];

    try {
      for (const item of forStudent) {
        try {
          const topicDef = TOPICS.find((t) => t.id === item.topicId);
          const required = topicDef?.passingScore ?? 75;
          await recordTopicCompletion({
            uid: item.uid,
            topicId: item.topicId,
            scorePercent: item.scorePercent,
            passed: item.scorePercent >= required,
          });
          const idx = remaining.findIndex((r) => r.queueId === item.queueId);
          if (idx >= 0) remaining.splice(idx, 1);
        } catch (err) {
          setLastSyncError(
            err instanceof Error ? err.message : 'Waiting for connection to save your progress.'
          );
          break;
        }
      }
      saveQueue(remaining);
    } finally {
      flushingRef.current = false;
      setIsFlushingQueue(false);
    }
  }, [firebaseUser, studentProfile?.approved, studentProfile?.blocked, saveQueue]);

  useEffect(() => {
    void flushCompletionQueueNow();
    const onOnline = () => {
      void flushCompletionQueueNow();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushCompletionQueueNow]);

  const activeProgressMap: Record<string, TopicProgressEntry> = isApprovedStudent
    ? studentProfile?.progress || {}
    : localProgress;

  const submitTopicAttempt = useCallback(
    async (input: SubmitTopicAttemptInput): Promise<SubmitTopicAttemptResult> => {
      const topicDef = TOPICS.find((t) => t.id === input.topicId);
      const requiredScore = topicDef?.passingScore ?? 75;
      const roundedScore = Math.min(100, Math.max(0, Math.round(input.scorePercent)));
      const passed = roundedScore >= requiredScore;
      const prevBadges = buildBadges(activeProgressMap);

      if (studentProfile?.blocked) {
        return {
          status: 'guest-local',
          passed: false,
          newBadges: [],
          message: 'Account paused by your teacher.',
        };
      }

      // Guest or unapproved users save progress locally on device ONLY (never sent to Firebase)
      if (!firebaseUser || !studentProfile || !studentProfile.approved) {
        const existing = localProgress[input.topicId];
        const nextPassed = Boolean(existing?.passed || passed);
        const existingPassedAt =
          typeof existing?.passedAtMs === 'number' && existing.passedAtMs > 0
            ? existing.passedAtMs
            : null;
        const nextPassedAtMs = existingPassedAt ?? (passed ? Date.now() : null);

        const nextLocalProgress: Record<string, TopicProgressEntry> = {
          ...localProgress,
          [input.topicId]: {
            passed: nextPassed,
            score: roundedScore,
            bestScore: Math.max(existing?.bestScore ?? 0, roundedScore),
            attempts: (existing?.attempts ?? 0) + 1,
            passedAtMs: nextPassedAtMs,
          },
        };
        setLocalProgress(nextLocalProgress);
        saveLocalProgress(localProgressKey, nextLocalProgress);

        const currBadges = buildBadges(nextLocalProgress);
        const newBadges = currBadges.filter(
          (b) => b.unlocked && !prevBadges.find((p) => p.id === b.id)?.unlocked
        );

        return {
          status: 'guest-local',
          passed,
          newBadges,
          message:
            'Guest mode: your progress is saved on this device only. Sign in so your teacher can see your progress.',
        };
      }

      const isOfflineNow =
        !isFirebaseReady() ||
        (typeof navigator !== 'undefined' && navigator.onLine === false);

      if (isOfflineNow) {
        const queuedItem: QueuedTopicCompletion = {
          queueId: `${firebaseUser.uid}_${input.topicId}_${Date.now()}`,
          uid: firebaseUser.uid,
          topicId: input.topicId,
          scorePercent: roundedScore,
          correctCount: input.correctCount,
          totalQuestions: input.totalQuestions,
          queuedAtIso: new Date().toISOString(),
        };
        saveQueue([...queueRef.current, queuedItem]);
        return {
          status: 'queued',
          passed,
          newBadges: [],
          message: 'Saved offline — your completion will upload automatically when you are back online.',
        };
      }

      try {
        await recordTopicCompletion({
          uid: firebaseUser.uid,
          topicId: input.topicId,
          scorePercent: roundedScore,
          passed,
        });

        const simulatedProgress: Record<string, TopicProgressEntry> = {
          ...studentProfile.progress,
          [input.topicId]: {
            passed: Boolean(studentProfile.progress[input.topicId]?.passed || passed),
            score: roundedScore,
            bestScore: Math.max(
              studentProfile.progress[input.topicId]?.bestScore ?? 0,
              roundedScore
            ),
            attempts: (studentProfile.progress[input.topicId]?.attempts ?? 0) + 1,
          },
        };
        const currBadges = buildBadges(simulatedProgress);
        const newBadges = currBadges.filter(
          (b) => b.unlocked && !prevBadges.find((p) => p.id === b.id)?.unlocked
        );

        return {
          status: 'saved',
          passed,
          newBadges,
        };
      } catch {
        const queuedItem: QueuedTopicCompletion = {
          queueId: `${firebaseUser.uid}_${input.topicId}_${Date.now()}`,
          uid: firebaseUser.uid,
          topicId: input.topicId,
          scorePercent: roundedScore,
          correctCount: input.correctCount,
          totalQuestions: input.totalQuestions,
          queuedAtIso: new Date().toISOString(),
        };
        saveQueue([...queueRef.current, queuedItem]);
        return {
          status: 'queued',
          passed,
          newBadges: [],
          message: 'Connection hiccup — saved locally and will upload when back online.',
        };
      }
    },
    [firebaseUser, studentProfile, localProgress, localProgressKey, activeProgressMap, saveQueue]
  );

  const getTopicAccess = useCallback(
    (topicId: TopicId): TopicAccessStatus => {
      return evaluateTopicAccess(topicId, {
        studentProfile,
        topicsSettings,
        guestProgress: localProgress,
        isTeacher,
        nowMs,
      });
    },
    [studentProfile, topicsSettings, localProgress, isTeacher, nowMs]
  );

  const isTopicUnlocked = useCallback(
    (topicId: TopicId): boolean => getTopicAccess(topicId).unlocked,
    [getTopicAccess]
  );

  const getTopicRetryStatus = useCallback(
    (topicId: TopicId): RetryStatus => {
      return getDailyRetryStatus(
        studentProfile,
        topicId,
        topicsSettings.maxRetriesPerDay,
        nowMs
      );
    },
    [studentProfile, topicsSettings.maxRetriesPerDay, nowMs]
  );

  const badges = buildBadges(activeProgressMap);

  return (
    <ProgressContext.Provider
      value={{
        topicsSettings,
        queuedCompletions: firebaseUser
          ? queuedCompletions.filter((q) => q.uid === firebaseUser.uid)
          : [],
        isFlushingQueue,
        lastSyncError,
        submitTopicAttempt,
        flushCompletionQueueNow,
        getTopicAccess,
        isTopicUnlocked,
        getTopicRetryStatus,
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
