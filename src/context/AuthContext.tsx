import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  firebaseAuth,
  googleProvider,
  isFirebaseReady,
  testConnection,
} from '../config/firebase';
import {
  checkIsTeacherUid,
  createOrUpdateStudentProfile,
  subscribeToStudentProfile,
} from '../services/firebaseService';
import { StudentProfile } from '../types/chemistry';
import {
  hasStorageFailure,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  subscribeStorageFailure,
} from '../utils/safeStorage';

const PROFILE_CACHE_PREFIX = 'ilab_student_profile_v1_';
const LOCAL_GUEST_FLAG_KEY = 'ilab_local_guest_mode_v1';

export type AuthModalMode = 'student' | 'teacher' | 'profile-setup';

export interface AuthModalOptions {
  mode?: AuthModalMode;
  reason?: string;
  onSuccess?: () => void;
}

interface AuthContextType {
  firebaseUser: User | null;
  studentProfile: StudentProfile | null;
  isTeacher: boolean;
  isGuestSession: boolean;
  needsProfileSetup: boolean;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  storageUnavailable: boolean;
  signInModalOpen: boolean;
  signInModalMode: AuthModalMode;
  signInModalReason: string | null;
  openSignInModal: (options?: AuthModalOptions) => void;
  closeSignInModal: () => void;
  signInWithGoogle: (asTeacher?: boolean) => Promise<{ ok: boolean; error?: string }>;
  signInAsGuest: () => Promise<{ ok: boolean; error?: string }>;
  saveProfileSetup: (displayName: string, section: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadCachedProfile(uid: string): StudentProfile | null {
  try {
    const raw = safeGetItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return null;
  }
}

function saveCachedProfile(profile: StudentProfile | null): void {
  if (!profile) return;
  try {
    safeSetItem(`${PROFILE_CACHE_PREFIX}${profile.uid}`, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [localGuestMode, setLocalGuestMode] = useState<boolean>(() => {
    try {
      return safeGetItem(LOCAL_GUEST_FLAG_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [authReady, setAuthReady] = useState<boolean>(() => !isFirebaseReady());
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileLoadedForUid, setProfileLoadedForUid] = useState<string | null>(null);
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [signInModalMode, setSignInModalMode] = useState<AuthModalMode>('student');
  const [signInModalReason, setSignInModalReason] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState<boolean>(() => hasStorageFailure());

  const onSuccessRef = useRef<(() => void) | null>(null);
  const actionLockRef = useRef<boolean>(false);

  useEffect(() => {
    setStorageUnavailable(hasStorageFailure());
    return subscribeStorageFailure((failed) => setStorageUnavailable(failed));
  }, []);

  // Verify Firestore connectivity gently once when Firebase is active
  useEffect(() => {
    if (isFirebaseReady()) {
      void testConnection();
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!firebaseAuth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setStudentProfile(null);
        setIsTeacher(false);
        setProfileLoadedForUid(null);
      }
    });
    return () => unsub();
  }, []);

  // Listen to teacher check + live student profile when signed in
  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    const uid = firebaseUser.uid;

    // Load cached student profile immediately for offline resilience
    const cached = loadCachedProfile(uid);
    if (cached) {
      setStudentProfile(cached);
    }

    if (firebaseUser.emailVerified && !firebaseUser.isAnonymous) {
      void checkIsTeacherUid(uid).then((teacherFlag) => {
        if (active) setIsTeacher(teacherFlag);
      });
    } else {
      setIsTeacher(false);
    }

    const unsubProfile = subscribeToStudentProfile(
      uid,
      (profile) => {
        if (!active) return;
        setProfileLoadedForUid(uid);
        if (profile) {
          setStudentProfile(profile);
          saveCachedProfile(profile);
        } else if (!cached) {
          setStudentProfile(null);
        }
      },
      () => {
        if (active) {
          setProfileLoadedForUid(uid);
        }
      }
    );

    return () => {
      active = false;
      unsubProfile();
    };
  }, [firebaseUser]);

  const needsProfileSetup = Boolean(
    firebaseUser &&
      !isTeacher &&
      profileLoadedForUid === firebaseUser.uid &&
      (!studentProfile || !studentProfile.displayName.trim() || !studentProfile.section.trim())
  );

  // Prompt for name & section right after first login if missing
  useEffect(() => {
    if (needsProfileSetup && !signInModalOpen && signInModalMode !== 'teacher') {
      setSignInModalMode('profile-setup');
      setSignInModalReason('Welcome! Enter your name and section so your teacher can approve you.');
      setSignInModalOpen(true);
    }
  }, [needsProfileSetup, signInModalOpen, signInModalMode]);

  const openSignInModal = useCallback((options: AuthModalOptions = {}) => {
    setAuthError(null);
    setSignInModalMode(options.mode || 'student');
    setSignInModalReason(options.reason || null);
    onSuccessRef.current = options.onSuccess || null;
    setSignInModalOpen(true);
  }, []);

  const closeSignInModal = useCallback(() => {
    setSignInModalOpen(false);
    setSignInModalReason(null);
    onSuccessRef.current = null;
  }, []);

  const signInWithGoogle = useCallback(
    async (asTeacher = false): Promise<{ ok: boolean; error?: string }> => {
      if (actionLockRef.current) return { ok: false, error: 'Please wait...' };
      if (!firebaseAuth || !googleProvider) {
        const msg =
          'Google Sign-In requires an online hosted copy with a valid Firebase API key. You can continue as a guest offline.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }

      actionLockRef.current = true;
      setAuthError(null);
      setAuthLoading(true);
      try {
        const cred = await signInWithPopup(firebaseAuth, googleProvider);
        try {
          safeRemoveItem(LOCAL_GUEST_FLAG_KEY);
        } catch {
          // ignore
        }
        setLocalGuestMode(false);

        const teacherMatch = cred.user.emailVerified
          ? await checkIsTeacherUid(cred.user.uid)
          : false;
        setIsTeacher(teacherMatch);

        if (asTeacher && !teacherMatch) {
          setSignInModalMode('teacher');
          return { ok: true };
        }

        if (teacherMatch) {
          setSignInModalOpen(false);
          onSuccessRef.current?.();
          onSuccessRef.current = null;
          return { ok: true };
        }

        // Student login: modal automatically switches to profile-setup if student doc doesn't exist
        setSignInModalOpen(false);
        onSuccessRef.current?.();
        onSuccessRef.current = null;
        return { ok: true };
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : 'Google Sign-In failed.';
        const friendly = rawMsg.includes('popup-closed-by-user')
          ? 'Sign-in window was closed before finishing.'
          : rawMsg.includes('network-request-failed')
          ? 'Network unavailable. Try continuing as a guest offline.'
          : rawMsg;
        setAuthError(friendly);
        return { ok: false, error: friendly };
      } finally {
        setAuthLoading(false);
        actionLockRef.current = false;
      }
    },
    []
  );

  const signInAsGuest = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (actionLockRef.current) return { ok: false, error: 'Please wait...' };
    actionLockRef.current = true;
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (firebaseAuth && (typeof navigator === 'undefined' || navigator.onLine)) {
        try {
          await signInAnonymously(firebaseAuth);
          setLocalGuestMode(false);
          try {
            safeRemoveItem(LOCAL_GUEST_FLAG_KEY);
          } catch {
            // ignore
          }
          setSignInModalOpen(false);
          onSuccessRef.current?.();
          onSuccessRef.current = null;
          return { ok: true };
        } catch {
          // Fall back gracefully to local guest session if anonymous provider is disabled or unreachable
        }
      }

      setLocalGuestMode(true);
      try {
        safeSetItem(LOCAL_GUEST_FLAG_KEY, '1');
      } catch {
        // ignore
      }
      setSignInModalOpen(false);
      onSuccessRef.current?.();
      onSuccessRef.current = null;
      return { ok: true };
    } finally {
      setAuthLoading(false);
      actionLockRef.current = false;
    }
  }, []);

  const saveProfileSetup = useCallback(
    async (displayName: string, section: string): Promise<{ ok: boolean; error?: string }> => {
      if (actionLockRef.current) return { ok: false, error: 'Please wait...' };
      const cleanName = displayName.trim();
      const cleanSection = section.trim();
      if (!cleanName) {
        const msg = 'Please enter your full name.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (!cleanSection) {
        const msg = 'Please enter your section (for example: 3F).';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (!firebaseUser) {
        const msg = 'Please sign in first.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }

      actionLockRef.current = true;
      setAuthLoading(true);
      setAuthError(null);
      try {
        await createOrUpdateStudentProfile({
          uid: firebaseUser.uid,
          displayName: cleanName,
          section: cleanSection,
          email: firebaseUser.email,
          isAnonymous: firebaseUser.isAnonymous,
        });
        setSignInModalOpen(false);
        setSignInModalReason(null);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save your profile right now.';
        setAuthError(msg);
        return { ok: false, error: msg };
      } finally {
        setAuthLoading(false);
        actionLockRef.current = false;
      }
    },
    [firebaseUser]
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    setLocalGuestMode(false);
    setIsTeacher(false);
    try {
      safeRemoveItem(LOCAL_GUEST_FLAG_KEY);
      if (firebaseUser?.uid) {
        safeRemoveItem(`${PROFILE_CACHE_PREFIX}${firebaseUser.uid}`);
      }
    } catch {
      // ignore
    }
    setStudentProfile(null);
    if (firebaseAuth) {
      try {
        await firebaseSignOut(firebaseAuth);
      } catch {
        // ignore
      }
    }
  }, [firebaseUser?.uid]);

  const clearAuthError = () => setAuthError(null);

  const isGuestSession = Boolean(
    localGuestMode || !firebaseUser || (firebaseUser.isAnonymous && !studentProfile)
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        studentProfile,
        isTeacher,
        isGuestSession,
        needsProfileSetup,
        authReady,
        authLoading,
        authError,
        storageUnavailable,
        signInModalOpen,
        signInModalMode,
        signInModalReason,
        openSignInModal,
        closeSignInModal,
        signInWithGoogle,
        signInAsGuest,
        saveProfileSetup,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
