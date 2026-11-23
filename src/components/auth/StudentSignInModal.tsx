import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  GraduationCap,
  LogIn,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseReady } from '../../config/firebase';

export const StudentSignInModal: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    isTeacher,
    authLoading,
    authError,
    signInModalOpen,
    signInModalMode,
    signInModalReason,
    closeSignInModal,
    signInWithGoogle,
    signInAsGuest,
    saveProfileSetup,
    openSignInModal,
    clearAuthError,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [section, setSection] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (signInModalOpen) {
      setLocalError(null);
      setDisplayName(studentProfile?.displayName || firebaseUser?.displayName || '');
      setSection(studentProfile?.section || '');
      setCopiedUid(false);
    }
  }, [signInModalOpen, signInModalMode, studentProfile, firebaseUser?.displayName]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signInModalOpen && signInModalMode !== 'profile-setup') {
        closeSignInModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [signInModalOpen, signInModalMode, closeSignInModal]);

  if (!signInModalOpen) return null;

  const displayError = localError || authError;
  const firebaseAvailable = isFirebaseReady();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!displayName.trim()) {
      setLocalError('Please enter your name.');
      return;
    }
    if (!section.trim()) {
      setLocalError('Please enter your section (for example: 3F).');
      return;
    }

    await saveProfileSetup(displayName.trim(), section.trim());
  };

  const handleCopyUid = async () => {
    if (!firebaseUser?.uid) return;
    try {
      await navigator.clipboard.writeText(firebaseUser.uid);
      setCopiedUid(true);
      window.setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
      onClick={() => {
        if (signInModalMode !== 'profile-setup') closeSignInModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 space-y-5 relative text-[#1f3a56]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#0284c7] flex items-center justify-center shrink-0">
              {signInModalMode === 'teacher' ? (
                <GraduationCap className="w-5 h-5" />
              ) : signInModalMode === 'profile-setup' ? (
                <UserCheck className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id="auth-modal-title" className="font-display text-lg font-bold text-[#1f3a56]">
                {signInModalMode === 'teacher'
                  ? 'Teacher Sign In'
                  : signInModalMode === 'profile-setup'
                    ? 'Complete Student Profile'
                    : 'Student Sign In'}
              </h2>
              <p className="text-xs text-[#3b5775]">
                {signInModalMode === 'teacher'
                  ? 'Sign in with your verified Google account'
                  : signInModalMode === 'profile-setup'
                    ? 'Enter your name and class section for teacher approval'
                    : 'Sign in with Google to save progress or continue as guest'}
              </p>
            </div>
          </div>
          {signInModalMode !== 'profile-setup' && (
            <button
              type="button"
              onClick={closeSignInModal}
              className="p-1.5 rounded-lg text-[#3b5775] hover:bg-[#f4f9fe] cursor-pointer"
              aria-label="Close sign-in dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {signInModalReason && (
          <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs text-[#1f3a56] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <span>{signInModalReason}</span>
          </div>
        )}

        {!firebaseAvailable && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Online class sync is unavailable right now (offline or unconfigured). You can still learn in guest mode and save progress locally on this device.
          </div>
        )}

        {displayError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {signInModalMode === 'profile-setup' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="student-name-input" className="block text-xs font-bold text-[#1f3a56]">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#526d88] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="First and last name"
                  disabled={authLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#dbe9f4] bg-[#f4f9fe] text-sm text-[#1f3a56] placeholder:text-[#526d88]/70 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-section-input"
                className="block text-xs font-bold text-[#1f3a56]"
              >
                Section
              </label>
              <input
                id="student-section-input"
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. 3F"
                disabled={authLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dbe9f4] bg-[#f4f9fe] text-sm text-[#1f3a56] placeholder:text-[#526d88]/70 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              {authLoading ? 'Saving profile...' : 'Save & Request Teacher Approval'}
            </button>
          </form>
        )}

        {signInModalMode === 'student' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void signInWithGoogle(false)}
              disabled={authLoading || !firebaseAvailable}
              className="w-full py-3 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-55 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => void signInAsGuest()}
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-[#0284c7]" />
              <span>Continue as guest</span>
            </button>

            <p className="text-[11px] text-[#3b5775] text-center leading-relaxed pt-1">
              Guest mode: your progress is saved on this device only. Sign in so your teacher can see your progress.
            </p>

            <div className="pt-2 border-t border-[#dbe9f4] flex justify-center">
              <button
                type="button"
                onClick={() => openSignInModal({ mode: 'teacher' })}
                className="text-xs font-bold text-[#0284c7] hover:underline cursor-pointer"
              >
                Teacher sign in →
              </button>
            </div>
          </div>
        )}

        {signInModalMode === 'teacher' && (
          <div className="space-y-4">
            <p className="text-xs text-[#3b5775] leading-relaxed">
              Teacher accounts are authorized by adding your Google UID to the{' '}
              <code className="px-1.5 py-0.5 rounded bg-[#f4f9fe] border border-[#dbe9f4] font-mono text-[#1f3a56]">
                teachers
              </code>{' '}
              collection in Firestore.
            </p>

            {firebaseUser && !firebaseUser.isAnonymous && !isTeacher && (
              <div className="p-3.5 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] space-y-2 text-xs">
                <div className="font-bold text-[#1f3a56]">
                  Signed in as {firebaseUser.email}, not yet listed in teachers/
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#ffffff] px-2.5 py-2 rounded-xl border border-[#dbe9f4] font-mono text-[11px]">
                  <span className="truncate">{firebaseUser.uid}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyUid()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f4f9fe] hover:bg-[#eaf3fc] border border-[#dbe9f4] text-[#1f3a56] font-sans font-bold cursor-pointer shrink-0"
                  >
                    {copiedUid ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUid ? 'Copied' : 'Copy UID'}</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void signInWithGoogle(true)}
              disabled={authLoading || !firebaseAvailable}
              className="w-full py-3 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-55 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Teacher Google Account'}</span>
            </button>

            <div className="pt-1 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => openSignInModal({ mode: 'student' })}
                className="font-bold text-[#0284c7] hover:underline cursor-pointer"
              >
                ← Back to Student Sign In
              </button>
              <button
                type="button"
                onClick={closeSignInModal}
                className="px-3 py-1.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] font-semibold text-[#1f3a56] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
