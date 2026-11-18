import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PracticeProgress, SectionPolicySettings } from '../types/chemistry';
import {
  advanceClockHighWater,
  DEFAULT_SECTION_POLICY,
  isSessionTokenValid,
  StudentSession,
  StudentUser,
} from '../engine/sheetsSync';
import {
  changeStudentPin,
  loginStudent,
  logoutStudent,
  syncStudentSession,
} from '../services/sheetsClient';

const SESSION_STORAGE_KEY = 'ilab_student_session_v1';
const POLICY_STORAGE_KEY = 'ilab_section_policy_v1';
const CLOCK_HWM_STORAGE_KEY = 'ilab_clock_hwm_v1';

export interface RemoteSyncPayload {
  username: string;
  progressMap?: Record<string, PracticeProgress>;
  unlockOverrides?: string[];
  settings?: SectionPolicySettings;
  serverNowIso?: string;
  syncedAtMs: number;
}

export interface SignInModalOptions {
  mode?: 'login' | 'change-pin';
  reason?: string;
  onSuccess?: (session: StudentSession) => Promise<void> | void;
}

interface AuthContextType {
  session: StudentSession | null;
  user: StudentUser | null;
  authLoading: boolean;
  authError: string | null;
  sectionPolicy: SectionPolicySettings;
  clockHighWaterMs: number | null;
  remoteSync: RemoteSyncPayload | null;
  signInModalOpen: boolean;
  signInModalMode: 'login' | 'change-pin';
  signInModalReason: string | null;
  openSignInModal: (options?: SignInModalOptions) => void;
  closeSignInModal: () => void;
  signInWithCredentials: (
    username: string,
    pin: string
  ) => Promise<{ ok: boolean; mustChangePin?: boolean; error?: string }>;
  submitPinChange: (
    currentPin: string,
    newPin: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  applyRemoteSyncData: (payload: Omit<RemoteSyncPayload, 'syncedAtMs'>) => void;
  refreshSessionFromServer: () => Promise<void>;
  handleExpiredSession: (message?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentSession;
    if (!isSessionTokenValid(parsed)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function loadStoredPolicy(): SectionPolicySettings {
  try {
    const raw = localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) return DEFAULT_SECTION_POLICY;
    return { ...DEFAULT_SECTION_POLICY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SECTION_POLICY;
  }
}

function loadClockHighWater(): number | null {
  try {
    const raw = localStorage.getItem(CLOCK_HWM_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<StudentSession | null>(() => loadStoredSession());
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sectionPolicy, setSectionPolicy] = useState<SectionPolicySettings>(() =>
    loadStoredPolicy()
  );
  const [clockHighWaterMs, setClockHighWaterMs] = useState<number | null>(() =>
    loadClockHighWater()
  );
  const [remoteSync, setRemoteSync] = useState<RemoteSyncPayload | null>(null);

  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [signInModalMode, setSignInModalMode] = useState<'login' | 'change-pin'>('login');
  const [signInModalReason, setSignInModalReason] = useState<string | null>(null);
  const onSuccessCallbackRef = useRef<
    ((s: StudentSession) => Promise<void> | void) | null
  >(null);

  const persistSession = useCallback((next: StudentSession | null) => {
    setSession(next);
    try {
      if (next) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const recordClockObservation = useCallback((serverNowIso?: string) => {
    const serverMs = serverNowIso ? Date.parse(serverNowIso) : null;
    setClockHighWaterMs((prev) => {
      // Only advance monotonic clock when not already rolled back below previous observation
      const deviceNow = Date.now();
      const safeDeviceNow =
        prev !== null && deviceNow < prev - 60_000 ? prev : deviceNow;
      const next = advanceClockHighWater(prev, safeDeviceNow, serverMs);
      try {
        localStorage.setItem(CLOCK_HWM_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Track monotonic clock progression every 30s while app is open
  useEffect(() => {
    recordClockObservation();
    const timer = setInterval(() => {
      recordClockObservation();
    }, 30_000);
    return () => clearInterval(timer);
  }, [recordClockObservation]);

  const applyRemoteSyncData = useCallback(
    (payload: Omit<RemoteSyncPayload, 'syncedAtMs'>) => {
      if (payload.serverNowIso) {
        recordClockObservation(payload.serverNowIso);
      }

      if (payload.settings) {
        const normalizedPolicy: SectionPolicySettings = {
          passingScore: Math.min(
            100,
            Math.max(50, Number(payload.settings.passingScore || 70))
          ),
          waitingTimeHours: Math.max(0, Number(payload.settings.waitingTimeHours || 0)),
          inactivityDays: Math.max(1, Number(payload.settings.inactivityDays || 7)),
          cooldownMinutes: Math.max(1, Number(payload.settings.cooldownMinutes || 15)),
          sessionExpiryDays: Math.max(1, Number(payload.settings.sessionExpiryDays || 60)),
          syncedAt: new Date().toISOString(),
        };
        setSectionPolicy(normalizedPolicy);
        try {
          localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(normalizedPolicy));
        } catch {
          // ignore
        }
      }

      setRemoteSync({
        ...payload,
        syncedAtMs: Date.now(),
      });
    },
    [recordClockObservation]
  );

  const handleExpiredSession = useCallback(
    (message?: string) => {
      persistSession(null);
      setAuthError(message || 'Your sign-in session expired. Please sign in with your PIN again.');
    },
    [persistSession]
  );

  const refreshSessionFromServer = useCallback(async () => {
    if (!session || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }
    if (!isSessionTokenValid(session)) {
      handleExpiredSession();
      return;
    }

    try {
      const res = await syncStudentSession(session.sessionToken);
      if (!res.ok) {
        if (res.sessionExpired) {
          handleExpiredSession(res.error);
        }
        return;
      }

      if (res.user) {
        persistSession({
          ...session,
          user: res.user,
        });
      }

      applyRemoteSyncData({
        username: res.user?.username || session.user.username,
        progressMap: res.progressMap,
        unlockOverrides: res.unlockOverrides,
        settings: res.settings,
        serverNowIso: res.serverNowIso,
      });
    } catch {
      // Stay offline-safe when network or Apps Script cannot be reached
    }
  }, [session, persistSession, applyRemoteSyncData, handleExpiredSession]);

  // Sync section settings & progress on mount and whenever device reconnects
  useEffect(() => {
    if (!session) return;
    void refreshSessionFromServer();

    const handleOnline = () => {
      void refreshSessionFromServer();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session?.sessionToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSignInModal = useCallback((options: SignInModalOptions = {}) => {
    setAuthError(null);
    setSignInModalMode(options.mode || 'login');
    setSignInModalReason(options.reason || null);
    onSuccessCallbackRef.current = options.onSuccess || null;
    setSignInModalOpen(true);
  }, []);

  const closeSignInModal = useCallback(() => {
    setSignInModalOpen(false);
    setSignInModalReason(null);
    onSuccessCallbackRef.current = null;
  }, []);

  const signInWithCredentials = useCallback(
    async (username: string, pin: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const res = await loginStudent(username, pin);
        if (!res.ok || !res.sessionToken || !res.user) {
          const msg = res.error || 'Could not sign in. Check your username and PIN.';
          setAuthError(msg);
          return { ok: false, error: msg };
        }

        const nextSession: StudentSession = {
          sessionToken: res.sessionToken,
          tokenExpiresAt:
            res.tokenExpiresAt ||
            new Date(Date.now() + 60 * 86400000).toISOString(),
          user: res.user,
        };

        persistSession(nextSession);
        applyRemoteSyncData({
          username: res.user.username,
          progressMap: res.progressMap,
          unlockOverrides: res.unlockOverrides,
          settings: res.settings,
          serverNowIso: res.serverNowIso,
        });

        const cb = onSuccessCallbackRef.current;
        if (res.user.mustChangePin) {
          setSignInModalMode('change-pin');
          setSignInModalReason(
            'Your teacher reset your PIN. Please set a new personal PIN to continue.'
          );
          if (cb) {
            void cb(nextSession);
            onSuccessCallbackRef.current = null;
          }
          return { ok: true, mustChangePin: true };
        }

        setSignInModalOpen(false);
        setSignInModalReason(null);
        if (cb) {
          onSuccessCallbackRef.current = null;
          await cb(nextSession);
        }
        return { ok: true, mustChangePin: false };
      } catch (err) {
        const msg =
          err instanceof Error && err.message === 'offline'
            ? 'You are offline. Reconnect to sign in with your username and PIN.'
            : 'Could not reach the Google Sheet service. Please check your connection.';
        setAuthError(msg);
        return { ok: false, error: msg };
      } finally {
        setAuthLoading(false);
      }
    },
    [persistSession, applyRemoteSyncData]
  );

  const submitPinChange = useCallback(
    async (currentPin: string, newPin: string) => {
      if (!session) {
        return { ok: false, error: 'Please sign in first.' };
      }
      setAuthError(null);
      setAuthLoading(true);
      try {
        const res = await changeStudentPin(session.sessionToken, currentPin, newPin);
        if (!res.ok || !res.sessionToken) {
          if (res.sessionExpired) {
            handleExpiredSession(res.error);
          }
          const msg = res.error || 'Could not update PIN.';
          setAuthError(msg);
          return { ok: false, error: msg };
        }

        const updatedSession: StudentSession = {
          sessionToken: res.sessionToken,
          tokenExpiresAt: res.tokenExpiresAt || session.tokenExpiresAt,
          user: {
            ...session.user,
            mustChangePin: false,
          },
        };
        persistSession(updatedSession);
        if (res.serverNowIso) {
          recordClockObservation(res.serverNowIso);
        }
        setSignInModalOpen(false);
        setSignInModalReason(null);
        return { ok: true };
      } catch (err) {
        const msg =
          err instanceof Error && err.message === 'offline'
            ? 'You are offline. Connect to update your PIN.'
            : 'Could not update PIN right now. Please try again.';
        setAuthError(msg);
        return { ok: false, error: msg };
      } finally {
        setAuthLoading(false);
      }
    },
    [session, persistSession, handleExpiredSession, recordClockObservation]
  );

  const signOut = useCallback(async () => {
    const token = session?.sessionToken;
    persistSession(null);
    setRemoteSync(null);
    setAuthError(null);
    if (token && (typeof navigator === 'undefined' || navigator.onLine)) {
      await logoutStudent(token);
    }
  }, [session, persistSession]);

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        authLoading,
        authError,
        sectionPolicy,
        clockHighWaterMs,
        remoteSync,
        signInModalOpen,
        signInModalMode,
        signInModalReason,
        openSignInModal,
        closeSignInModal,
        signInWithCredentials,
        submitPinChange,
        signOut,
        clearAuthError,
        applyRemoteSyncData,
        refreshSessionFromServer,
        handleExpiredSession,
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
