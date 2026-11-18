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
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onNavigateHome }) => {
  const { badges, queuedAttempts, isSyncingQueue, syncOfflineQueueNow } = useProgress();
  const { user, authError, openSignInModal, signOut, clearAuthError } = useAuth();
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Title: I-LAB */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none min-w-0"
          aria-label="Go to I-LAB home"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Atom className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white block leading-none">
              I-LAB
            </span>
          </div>
        </button>

        {/* Right Action Icons: Offline, Queue Sync, PWA Install, Badges, Account, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <OfflineIndicator />

          {user && queuedAttempts.length > 0 && (
            <button
              type="button"
              onClick={() => void syncOfflineQueueNow()}
              disabled={isSyncingQueue}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
              title="Sync queued practice attempts to your teacher sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{queuedAttempts.length} Queued</span>
            </button>
          )}

          <PWAInstallButton />

          {/* Badges counter */}
          <div
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
            title={`${unlockedBadgesCount} of ${badges.length} badges unlocked`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {unlockedBadgesCount} / {badges.length}
            </span>
          </div>

          {/* Student Session Control */}
          {user ? (
            <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <ShieldCheck
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <span
                className="hidden sm:inline text-xs font-semibold text-emerald-800 dark:text-emerald-200 max-w-[140px] truncate whitespace-nowrap"
                title={`Signed in as ${user.fullName} (${user.username})`}
              >
                {user.fullName || user.username}
              </span>
              <button
                type="button"
                onClick={() => openSignInModal({ mode: 'change-pin' })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-600 text-[11px] font-bold transition cursor-pointer"
                aria-label="Change your PIN"
                title="Change PIN"
              >
                <KeyRound className="w-3 h-3" />
                <span className="hidden lg:inline">PIN</span>
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold transition cursor-pointer"
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
              onClick={() =>
                openSignInModal({
                  reason:
                    'Optional: Sign in with your username and PIN to restore progress or submit scores.',
                })
              }
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              aria-label="Sign in with username and PIN"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Trigger Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Open customization settings"
            title="Settings & Appearance"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Auth Error Banner if sign-in fails */}
      {authError && !user && (
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
