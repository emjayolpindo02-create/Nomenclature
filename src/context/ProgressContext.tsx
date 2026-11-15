import React, { createContext, useContext, useEffect, useState } from 'react';
import { PracticeProgress } from '../types/chemistry';
import { PRACTICE_SETS } from '../data/practiceQuestions';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  getLessonUnlockStatus,
  getLocalDateKey,
  LessonUnlockStatus,
} from '../engine/lessonLock';

const LEGACY_PROGRESS_KEY = 'compound_naming_guide_progress_v1';

function getProgressStorageKey(uid: string): string {
  return `ilab_progress_v2_${uid}`;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface ProgressContextType {
  progressMap: Record<string, PracticeProgress>;
  progressLoading: boolean;
  recordPracticeResult: (
    libraryId: string,
    scorePercent: number
  ) => Promise<{ passed: boolean; newBadges: Badge[]; savedToAccount: boolean }>;
  isLibraryUnlocked: (libraryId: string) => boolean;
  getUnlockStatus: (libraryId: string) => LessonUnlockStatus;
  getPreviousLibraryTitle: (libraryId: string) => string | null;
  resetProgress: () => Promise<void>;
  badges: Badge[];
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function timestampToIso(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { user, ensureUserProfile } = useAuth();

  const [progressMap, setProgressMap] = useState<Record<string, PracticeProgress>>({});
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [rawPassedAtMap, setRawPassedAtMap] = useState<Record<string, Timestamp | null>>({});
  const [now, setNow] = useState<Date>(() => new Date());

  // Refresh clock every 30s so next-day unlocks activate automatically when midnight passes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Remove legacy unscoped localStorage key so no progress ever leaks across users
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Subscribe strictly to the signed-in user's own progress subcollection
  useEffect(() => {
    if (!user) {
      setProgressMap({});
      setRawPassedAtMap({});
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);

    // Hydrate user-scoped offline cache while Firestore connects
    try {
      const cached = localStorage.getItem(getProgressStorageKey(user.uid));
      if (cached) {
        setProgressMap(JSON.parse(cached));
      } else {
        setProgressMap({});
      }
    } catch {
      setProgressMap({});
    }

    const progressPath = `users/${user.uid}/progress`;
    const q = query(
      collection(db, 'users', user.uid, 'progress'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMap: Record<string, PracticeProgress> = {};
        const nextTimestamps: Record<string, Timestamp | null> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const libId = typeof data.libraryId === 'string' ? data.libraryId : docSnap.id;
          nextMap[libId] = {
            libraryId: libId,
            passed: Boolean(data.passed),
            bestScore: typeof data.bestScore === 'number' ? data.bestScore : 0,
            attempts: typeof data.attempts === 'number' ? data.attempts : 1,
            passedDate: typeof data.passedDate === 'string' ? data.passedDate : '',
            passedAt: timestampToIso(data.passedAt) || null,
            completedAt: timestampToIso(data.completedAt),
          };
          nextTimestamps[libId] = data.passedAt instanceof Timestamp ? data.passedAt : null;
        });

        setProgressMap(nextMap);
        setRawPassedAtMap(nextTimestamps);
        setProgressLoading(false);

        try {
          localStorage.setItem(getProgressStorageKey(user.uid), JSON.stringify(nextMap));
        } catch {
          // ignore
        }
      },
      (error) => {
        setProgressLoading(false);
        if (error.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.LIST, progressPath);
        } else {
          console.warn('Could not sync progress from Firestore:', error);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getPreviousLibraryTitle = (libraryId: string): string | null => {
    const idx = PRACTICE_SETS.findIndex((p) => p.id === libraryId);
    if (idx <= 0) return null;
    return PRACTICE_SETS[idx - 1].title;
  };

  const getUnlockStatus = (libraryId: string): LessonUnlockStatus => {
    return getLessonUnlockStatus(libraryId, progressMap, settings.passingScore, now);
  };

  const isLibraryUnlocked = (libraryId: string): boolean => {
    return getUnlockStatus(libraryId).unlocked;
  };

  const calculateBadges = (map: Record<string, PracticeProgress>): Badge[] => {
    const isPassed = (id: string) => !!map[id]?.passed;
    const hasPerfect = Object.values(map).some((p) => p.bestScore >= 100);

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
        description: 'Scored 100% on any practice set',
        icon: '⭐',
        unlocked: hasPerfect,
      },
    ];
  };

  const recordPracticeResult = async (libraryId: string, scorePercent: number) => {
    const roundedScore = Math.min(100, Math.max(0, Math.round(scorePercent)));
    const passed = roundedScore >= settings.passingScore;

    // If user is not signed in, do not persist or leak progress to shared storage
    if (!user) {
      return { passed, newBadges: [], savedToAccount: false };
    }

    const prevEntry = progressMap[libraryId];
    const alreadyPassed = !!prevEntry?.passed;
    const todayKey = getLocalDateKey(new Date());

    const finalPassed = alreadyPassed || passed;
    const finalPassedDate = alreadyPassed
      ? prevEntry.passedDate || todayKey
      : passed
      ? todayKey
      : '';

    const updatedEntry: PracticeProgress = {
      libraryId,
      passed: finalPassed,
      bestScore: Math.max(prevEntry?.bestScore || 0, roundedScore),
      attempts: (prevEntry?.attempts || 0) + 1,
      passedDate: finalPassedDate,
      passedAt: alreadyPassed
        ? prevEntry.passedAt || new Date().toISOString()
        : passed
        ? new Date().toISOString()
        : null,
      completedAt: new Date().toISOString(),
    };

    const newMap = { ...progressMap, [libraryId]: updatedEntry };
    setProgressMap(newMap);

    try {
      localStorage.setItem(getProgressStorageKey(user.uid), JSON.stringify(newMap));
    } catch {
      // ignore
    }

    // Ensure parent /users/{uid} exists before writing to subcollection
    await ensureUserProfile(user);

    const docPath = `users/${user.uid}/progress/${libraryId}`;
    const docRef = doc(db, 'users', user.uid, 'progress', libraryId);

    // Match firestore.rules immutability requirements for passedDate & passedAt
    const existingPassedTimestamp = rawPassedAtMap[libraryId];
    const firestorePayload = {
      userId: user.uid,
      libraryId,
      passed: finalPassed,
      bestScore: updatedEntry.bestScore,
      attempts: updatedEntry.attempts,
      passedDate: finalPassedDate,
      passedAt: alreadyPassed
        ? existingPassedTimestamp || serverTimestamp()
        : passed
        ? serverTimestamp()
        : null,
      completedAt: serverTimestamp(),
    };

    try {
      await setDoc(docRef, firestorePayload);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      } else {
        console.warn('Could not save progress to Firestore:', error);
      }
    }

    const prevBadges = calculateBadges(progressMap);
    const currBadges = calculateBadges(newMap);
    const newBadges = currBadges.filter(
      (b) => b.unlocked && !prevBadges.find((pb) => pb.id === b.id)?.unlocked
    );

    return { passed, newBadges, savedToAccount: true };
  };

  const resetProgress = async () => {
    setProgressMap({});
    setRawPassedAtMap({});
    if (!user) return;

    try {
      localStorage.removeItem(getProgressStorageKey(user.uid));
    } catch {
      // ignore
    }

    const progressPath = `users/${user.uid}/progress`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'progress'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.DELETE, progressPath);
      } else {
        console.warn('Could not reset progress in Firestore:', error);
      }
    }
  };

  const badges = calculateBadges(progressMap);

  return (
    <ProgressContext.Provider
      value={{
        progressMap,
        progressLoading,
        recordPracticeResult,
        isLibraryUnlocked,
        getUnlockStatus,
        getPreviousLibraryTitle,
        resetProgress,
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
