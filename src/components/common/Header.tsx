import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import {
  Settings as SettingsIcon,
  Award,
  Atom,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertCircle,
  X,
  Home,
  GraduationCap,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';
import { isOfflineFileCopy } from '../../config/appInfo';
import {
  applyPwaUpdate,
  dismissPwaUpdateBanner,
  usePwaStatus,
} from '../../utils/pwaStatus';

interface HeaderProps {
  onOpenSettings: () => void;
  onNavigateHome: () => void;
  onNavigateTeacher: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onNavigateHome,
  onNavigateTeacher,
}) => {
  const { badges, queuedCompletions } = useProgress();
  const {
    firebaseUser,
    studentProfile,
    isTeacher,
    authError,
    openSignInModal,
    signOut,
    clearAuthError,
  } = useAuth();
  const { updateAvailable } = usePwaStatus();
  const offlineCopy = isOfflineFileCopy();
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const userDisplayLabel = isTeacher
    ? `Teacher: ${firebaseUser?.displayName || firebaseUser?.email || 'Verified'}`
    : studentProfile
      ? `${studentProfile.displayName} (${studentProfile.section})`
      : firebaseUser?.isAnonymous
        ? 'Guest'
        : firebaseUser?.displayName || firebaseUser?.email || 'Student';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#dbe9f4] bg-[#ffffff]/95 backdrop-blur-md shadow-[0_2px_12px_-4px_rgba(31,58,86,0.08)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Title + Home */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none shrink-0"
            aria-label="Go to I-LAB start screen"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Atom className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-[#1f3a56] block leading-none whitespace-nowrap">
              I-LAB
            </span>
          </button>

          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer whitespace-nowrap"
            aria-label="Return to Start Screen"
            title="Start Screen"
          >
            <Home className="w-3.5 h-3.5 text-[#0284c7]" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <OfflineIndicator />
          <PWAInstallButton />

          {/* Badges counter */}
          <div
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] text-xs font-semibold text-[#1f3a56] border border-[#dbe9f4] whitespace-nowrap"
            title={`${unlockedBadgesCount} of ${badges.length} badges unlocked`}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {unlockedBadgesCount} / {badges.length}
            </span>
          </div>

          {isTeacher && (
            <button
              type="button"
              onClick={onNavigateTeacher}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teacher</span>
            </button>
          )}

          {/* Account Pill */}
          {firebaseUser ? (
            <div
              data-guide-id="header-signin"
              className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border ${
                studentProfile && !studentProfile.approved && !isTeacher
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-[#f4f9fe] border-[#dbe9f4]'
              }`}
            >
              {studentProfile && !studentProfile.approved && !isTeacher ? (
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7] shrink-0" aria-hidden="true" />
              )}
              <span
                className="hidden sm:inline text-xs font-bold text-[#1f3a56] max-w-[150px] truncate whitespace-nowrap"
                title={userDisplayLabel}
              >
                {userDisplayLabel}
              </span>
              {queuedCompletions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {queuedCompletions.length} queued
                </span>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ffffff] hover:bg-rose-50 text-[#1f3a56] hover:text-rose-800 border border-[#dbe9f4] text-[11px] font-bold transition cursor-pointer"
                aria-label="Sign out"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-guide-id="header-signin"
              onClick={() => openSignInModal({ mode: 'student' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              aria-label="Sign in"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-[#1f3a56] hover:text-[#0284c7] bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] transition cursor-pointer"
            aria-label="Open customization settings"
            title="Settings & Appearance"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PWA Update Available Banner */}
      {!offlineCopy && updateAvailable && (
        <div
          role="status"
          className="bg-[#0284c7] text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={() => void applyPwaUpdate()}
            className="inline-flex items-center gap-1.5 font-bold hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Update available. Tap to refresh</span>
          </button>
          <button
            type="button"
            onClick={dismissPwaUpdateBanner}
            className="p-0.5 rounded hover:bg-white/20 cursor-pointer"
            aria-label="Dismiss update banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && !firebaseUser && (
        <div className="bg-rose-600 text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            className="p-0.5 rounded hover:bg-white/20 cursor-pointer"
            aria-label="Dismiss sign-in notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
