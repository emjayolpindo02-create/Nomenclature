import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, LogIn, ShieldCheck, User, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSheetsConfigured } from '../../config/sheets';

export const StudentSignInModal: React.FC = () => {
  const {
    user,
    authLoading,
    authError,
    signInModalOpen,
    signInModalMode,
    signInModalReason,
    closeSignInModal,
    signInWithCredentials,
    submitPinChange,
    clearAuthError,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (signInModalOpen) {
      setLocalError(null);
      setPin('');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }
  }, [signInModalOpen, signInModalMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signInModalOpen) {
        closeSignInModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [signInModalOpen, closeSignInModal]);

  if (!signInModalOpen) return null;

  const sheetsReady = isSheetsConfigured();
  const displayError = localError || authError;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!username.trim()) {
      setLocalError('Please enter your username.');
      return;
    }
    if (!pin.trim()) {
      setLocalError('Please enter your PIN.');
      return;
    }

    await signInWithCredentials(username.trim(), pin.trim());
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!currentPin.trim()) {
      setLocalError('Please enter your current PIN.');
      return;
    }
    if (!/^\d{4,8}$/.test(newPin.trim())) {
      setLocalError('New PIN must be 4 to 8 digits.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setLocalError('New PIN and confirmation do not match.');
      return;
    }

    await submitPinChange(currentPin.trim(), newPin.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      onClick={closeSignInModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-auth-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {signInModalMode === 'change-pin' ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2
                id="student-auth-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {signInModalMode === 'change-pin' ? 'Update Your PIN' : 'Student Sign In'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {signInModalMode === 'change-pin'
                  ? `Signed in as ${user?.fullName || user?.username}`
                  : 'Enter your class username and PIN'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSignInModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close sign-in dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {signInModalReason && (
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>{signInModalReason}</span>
          </div>
        )}

        {!sheetsReady && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            Set <code>VITE_APPS_SCRIPT_URL</code> (ending in <code>/exec</code>) and{' '}
            <code>VITE_APPS_SCRIPT_SECRET</code> in environment variables, apply them, and verify in{' '}
            <strong>Settings → Connection check</strong>.
          </div>
        )}

        {displayError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {signInModalMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="student-username-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-username-input"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your roster username"
                  disabled={authLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-pin-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4–8 digit PIN"
                  disabled={authLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeSignInModal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{authLoading ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="current-pin-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Current PIN
              </label>
              <input
                id="current-pin-input"
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                disabled={authLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-pin-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                New PIN (4–8 digits)
              </label>
              <input
                id="new-pin-input"
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new 4–8 digit PIN"
                disabled={authLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-pin-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Confirm New PIN
              </label>
              <input
                id="confirm-pin-input"
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter new PIN"
                disabled={authLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeSignInModal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{authLoading ? 'Saving...' : 'Save New PIN'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
