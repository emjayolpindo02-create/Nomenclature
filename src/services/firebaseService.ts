import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import {
  firebaseDb,
  handleFirestoreError,
  OperationType,
} from '../config/firebase';
import {
  DailyRetryState,
  StudentProfile,
  TopicId,
  TopicProgressEntry,
  TopicTeacherRule,
  TopicsSettingsDoc,
} from '../types/chemistry';
import { getManilaDateKey } from '../engine/topicAccess';

export const DEFAULT_TOPICS_SETTINGS: TopicsSettingsDoc = {
  maxRetriesPerDay: 5,
  topics: {},
  updatedAtMs: null,
};

function timestampToMs(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: unknown }).toMillis === 'function') {
    try {
      return (val as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeProgressMap(raw: unknown): Record<string, TopicProgressEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, TopicProgressEntry> = {};
  for (const [topicId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const passedAtMs = timestampToMs(e.passedAt ?? e.passedAtMs);
    result[topicId] = {
      passed: Boolean(e.passed),
      score: Number(e.score ?? e.bestScore ?? 0),
      bestScore: Number(e.bestScore ?? e.score ?? 0),
      attempts: Number(e.attempts ?? 1),
      passedAtMs,
      passedAtIso: passedAtMs ? new Date(passedAtMs).toISOString() : null,
      passedDateManila: passedAtMs ? getManilaDateKey(passedAtMs) : null,
      completedAtIso:
        typeof e.completedAtIso === 'string'
          ? e.completedAtIso
          : timestampToMs(e.completedAt)
          ? new Date(timestampToMs(e.completedAt)!).toISOString()
          : undefined,
    };
  }
  return result;
}

function normalizeStudentDoc(uid: string, raw: Record<string, unknown>): StudentProfile {
  const dailyRaw = raw.dailyRetries as Record<string, unknown> | undefined;
  let dailyRetries: DailyRetryState | undefined;
  if (dailyRaw && typeof dailyRaw.dateKey === 'string' && dailyRaw.counts && typeof dailyRaw.counts === 'object') {
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(dailyRaw.counts as Record<string, unknown>)) {
      counts[k] = Number(v) || 0;
    }
    dailyRetries = { dateKey: dailyRaw.dateKey, counts };
  }

  return {
    uid: typeof raw.uid === 'string' ? raw.uid : uid,
    displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
    section: typeof raw.section === 'string' ? raw.section : '',
    email: typeof raw.email === 'string' ? raw.email : undefined,
    isAnonymous: Boolean(raw.isAnonymous),
    approved: Boolean(raw.approved),
    blocked: Boolean(raw.blocked),
    progress: normalizeProgressMap(raw.progress),
    dailyRetries,
    createdAtMs: timestampToMs(raw.createdAt),
    updatedAtMs: timestampToMs(raw.updatedAt),
  };
}

function normalizeTopicsSettingsDoc(raw: Record<string, unknown>): TopicsSettingsDoc {
  const rawTopics =
    raw.topics && typeof raw.topics === 'object'
      ? (raw.topics as Record<string, unknown>)
      : {};
  const topics: Record<string, TopicTeacherRule> = {};
  for (const [id, r] of Object.entries(rawTopics)) {
    if (!r || typeof r !== 'object') continue;
    const rule = r as Record<string, unknown>;
    topics[id] = {
      lockedForEveryone: Boolean(rule.lockedForEveryone),
      unlockedForEveryone: Boolean(rule.unlockedForEveryone),
      lockedSections: Array.isArray(rule.lockedSections)
        ? rule.lockedSections.filter((s): s is string => typeof s === 'string')
        : [],
      unlockedSections: Array.isArray(rule.unlockedSections)
        ? rule.unlockedSections.filter((s): s is string => typeof s === 'string')
        : [],
      lockedStudentUids: Array.isArray(rule.lockedStudentUids)
        ? rule.lockedStudentUids.filter((s): s is string => typeof s === 'string')
        : [],
      unlockedStudentUids: Array.isArray(rule.unlockedStudentUids)
        ? rule.unlockedStudentUids.filter((s): s is string => typeof s === 'string')
        : [],
      openAtMs: typeof rule.openAtMs === 'number' ? rule.openAtMs : null,
      closeAtMs: typeof rule.closeAtMs === 'number' ? rule.closeAtMs : null,
    };
  }

  return {
    maxRetriesPerDay:
      typeof raw.maxRetriesPerDay === 'number' && Number.isFinite(raw.maxRetriesPerDay)
        ? raw.maxRetriesPerDay
        : DEFAULT_TOPICS_SETTINGS.maxRetriesPerDay,
    topics,
    updatedAtMs: timestampToMs(raw.updatedAt),
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

export async function checkIsTeacherUid(uid: string): Promise<boolean> {
  if (!firebaseDb || !uid) return false;
  const path = `teachers/${uid}`;
  try {
    const snap = await getDoc(doc(firebaseDb, 'teachers', uid));
    return snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return false;
  }
}

export function subscribeToStudentProfile(
  uid: string,
  onData: (profile: StudentProfile | null) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!firebaseDb || !uid) {
    return () => {};
  }
  const path = `students/${uid}`;
  return onSnapshot(
    doc(firebaseDb, 'students', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeStudentDoc(uid, snap.data() as Record<string, unknown>));
    },
    (err) => {
      const info = handleFirestoreError(err, OperationType.GET, path);
      onError?.(info.error);
    }
  );
}

export function subscribeToTopicsSettings(
  onData: (settings: TopicsSettingsDoc) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!firebaseDb) {
    return () => {};
  }
  const path = 'settings/topics';
  return onSnapshot(
    doc(firebaseDb, 'settings', 'topics'),
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_TOPICS_SETTINGS);
        return;
      }
      onData(normalizeTopicsSettingsDoc(snap.data() as Record<string, unknown>));
    },
    (err) => {
      const info = handleFirestoreError(err, OperationType.GET, path);
      onError?.(info.error);
    }
  );
}

export function subscribeToAllStudents(
  onData: (students: StudentProfile[]) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  if (!firebaseDb) {
    return () => {};
  }
  const path = 'students';
  return onSnapshot(
    collection(firebaseDb, 'students'),
    (snap) => {
      const list = snap.docs.map((d) =>
        normalizeStudentDoc(d.id, d.data() as Record<string, unknown>)
      );
      onData(list);
    },
    (err) => {
      const info = handleFirestoreError(err, OperationType.LIST, path);
      onError?.(info.error);
    }
  );
}

export async function createOrUpdateStudentProfile(input: {
  uid: string;
  displayName: string;
  section: string;
  email?: string | null;
  isAnonymous: boolean;
}): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase is unavailable offline.');
  const path = `students/${input.uid}`;
  const ref = doc(firebaseDb, 'students', input.uid);
  const cleanName = input.displayName.trim().slice(0, 80);
  const cleanSection = input.section.trim().slice(0, 30);

  if (!cleanName || !cleanSection) {
    throw new Error('Please enter both your name and section.');
  }

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const payload: Record<string, unknown> = {
        uid: input.uid,
        displayName: cleanName,
        section: cleanSection,
        isAnonymous: Boolean(input.isAnonymous),
        approved: false,
        blocked: false,
        progress: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (input.email && input.email.trim()) {
        payload.email = input.email.trim().slice(0, 120);
      }
      await setDoc(ref, payload);
    } else {
      const updates: Record<string, unknown> = {
        displayName: cleanName,
        section: cleanSection,
        updatedAt: serverTimestamp(),
      };
      if (!existing.data()?.approved) {
        updates.isAnonymous = Boolean(input.isAnonymous);
        if (input.email && input.email.trim()) {
          updates.email = input.email.trim().slice(0, 120);
        }
      }
      await updateDoc(ref, updates);
    }
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.WRITE, path);
    throw new Error(info.error);
  }
}

export async function recordTopicCompletion(input: {
  uid: string;
  topicId: TopicId;
  scorePercent: number;
  passed: boolean;
}): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase is unavailable offline.');
  const path = `students/${input.uid}`;
  const ref = doc(firebaseDb, 'students', input.uid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Student profile not found.');
    }

    const rawData = snap.data() as Record<string, unknown>;
    if (!rawData.approved || rawData.blocked) {
      return;
    }

    const rawProgress =
      rawData.progress && typeof rawData.progress === 'object'
        ? { ...(rawData.progress as Record<string, Record<string, unknown>>) }
        : {};
    const prevEntry = rawProgress[input.topicId];
    const alreadyPassed = Boolean(prevEntry?.passed);
    const prevBestScore = Number(prevEntry?.bestScore ?? prevEntry?.score ?? 0);
    const prevAttempts = Number(prevEntry?.attempts ?? 0);
    const clampedScore = Math.min(100, Math.max(0, Math.round(input.scorePercent)));

    const nextEntry: Record<string, unknown> = {
      passed: Boolean(alreadyPassed || input.passed),
      score: clampedScore,
      bestScore: Math.max(prevBestScore, clampedScore),
      attempts: prevAttempts + 1,
      completedAt: serverTimestamp(),
    };

    if (alreadyPassed && prevEntry?.passedAt) {
      nextEntry.passedAt = prevEntry.passedAt;
    } else if (input.passed) {
      nextEntry.passedAt = serverTimestamp();
    } else {
      nextEntry.passedAt = prevEntry?.passedAt ?? null;
    }

    rawProgress[input.topicId] = nextEntry;

    // Track daily retry counts using Asia/Manila calendar day
    const todayKey = getManilaDateKey(Date.now());
    const existingRetries = rawData.dailyRetries as
      | { dateKey?: string; counts?: Record<string, number> }
      | undefined;
    const prevCounts =
      existingRetries?.dateKey === todayKey && existingRetries.counts
        ? { ...existingRetries.counts }
        : {};
    prevCounts[input.topicId] = (Number(prevCounts[input.topicId]) || 0) + 1;

    await updateDoc(ref, {
      progress: rawProgress,
      dailyRetries: {
        dateKey: todayKey,
        counts: prevCounts,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.UPDATE, path);
    throw new Error(info.error);
  }
}

// ---------- Teacher-Only Operations ----------

export async function approveStudent(uid: string, approved: boolean = true): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const path = `students/${uid}`;
  try {
    await updateDoc(doc(firebaseDb, 'students', uid), {
      approved,
      blocked: false,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.UPDATE, path);
    throw new Error(info.error);
  }
}

export async function blockStudent(uid: string, blocked: boolean): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const path = `students/${uid}`;
  try {
    await updateDoc(doc(firebaseDb, 'students', uid), {
      blocked,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.UPDATE, path);
    throw new Error(info.error);
  }
}

export async function removeStudent(uid: string): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const path = `students/${uid}`;
  try {
    await deleteDoc(doc(firebaseDb, 'students', uid));
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.DELETE, path);
    throw new Error(info.error);
  }
}

export async function approveAllInSection(
  students: StudentProfile[],
  section: string
): Promise<number> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const target = section.trim().toLowerCase();
  const pending = students.filter(
    (s) => !s.approved && !s.blocked && s.section.trim().toLowerCase() === target
  );
  await Promise.all(pending.map((s) => approveStudent(s.uid, true)));
  return pending.length;
}

export async function resetStudentProgress(uid: string): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const path = `students/${uid}`;
  try {
    await updateDoc(doc(firebaseDb, 'students', uid), {
      progress: {},
      dailyRetries: {
        dateKey: getManilaDateKey(Date.now()),
        counts: {},
      },
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.UPDATE, path);
    throw new Error(info.error);
  }
}

export async function unlockTopicForStudentNow(
  currentSettings: TopicsSettingsDoc,
  topicId: TopicId,
  studentUid: string,
  teacherUid: string
): Promise<void> {
  const nextTopics = { ...currentSettings.topics };
  const existingRule = { ...(nextTopics[topicId] || {}) };
  const lockedStudentUids = (existingRule.lockedStudentUids || []).filter((id) => id !== studentUid);
  const unlockedStudentUids = Array.from(
    new Set([...(existingRule.unlockedStudentUids || []), studentUid])
  );
  nextTopics[topicId] = {
    ...existingRule,
    lockedStudentUids,
    unlockedStudentUids,
  };
  await saveTopicsSettings({
    maxRetriesPerDay: currentSettings.maxRetriesPerDay,
    topics: nextTopics,
    updatedBy: teacherUid,
  });
}

export async function saveTopicsSettings(input: {
  maxRetriesPerDay: number;
  topics: Record<string, TopicTeacherRule>;
  updatedBy?: string;
}): Promise<void> {
  if (!firebaseDb) throw new Error('Firebase unavailable.');
  const path = 'settings/topics';
  try {
    const sanitizedTopics: Record<string, TopicTeacherRule> = {};
    for (const [topicId, rule] of Object.entries(input.topics || {})) {
      sanitizedTopics[topicId] = {
        lockedForEveryone: Boolean(rule.lockedForEveryone),
        unlockedForEveryone: Boolean(rule.unlockedForEveryone),
        lockedSections: Array.isArray(rule.lockedSections) ? rule.lockedSections : [],
        unlockedSections: Array.isArray(rule.unlockedSections) ? rule.unlockedSections : [],
        lockedStudentUids: Array.isArray(rule.lockedStudentUids) ? rule.lockedStudentUids : [],
        unlockedStudentUids: Array.isArray(rule.unlockedStudentUids) ? rule.unlockedStudentUids : [],
        openAtMs: typeof rule.openAtMs === 'number' ? rule.openAtMs : null,
        closeAtMs: typeof rule.closeAtMs === 'number' ? rule.closeAtMs : null,
      };
    }

    const payload: Record<string, unknown> = {
      maxRetriesPerDay: Math.min(50, Math.max(0, Math.floor(input.maxRetriesPerDay))),
      topics: sanitizedTopics,
      updatedAt: serverTimestamp(),
    };
    if (input.updatedBy) {
      payload.updatedBy = input.updatedBy;
    }

    await setDoc(doc(firebaseDb, 'settings', 'topics'), payload);
  } catch (err) {
    const info = handleFirestoreError(err, OperationType.WRITE, path);
    throw new Error(info.error);
  }
}
