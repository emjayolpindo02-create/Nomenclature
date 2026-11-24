import React, { useEffect, useRef, useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import {
  Settings as SettingsIcon,
  Award,
  Atom,
  User,
  X,
  Home,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useStudent } from '../../context/StudentContext';
import { isOfflineFileCopy } from '../../config/appInfo';
import {
  applyPwaUpdate,
  dismissPwaUpdateBanner,
  usePwaStatus,
} from '../../utils/pwaStatus';

interface HeaderProps {
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onNavigateHome,
}) => {
  const {
    badges,
    queuedResults,
    isFlushingQueue,
    sheetsConfigured,
    flushResultsQueueNow,
  } = useProgress();
  const { studentIdentity, openIdentityModal } = useStudent();
  const { updateAvailable } = usePwaStatus();
  const offlineCopy = isOfflineFileCopy();
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const [syncNotice, setSyncNotice] = useState<{
    type: 'ok' | 'warn';
    text: string;
  } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleManualSync = async () => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncNotice({
        type: 'warn',
        text: 'Offline — saved locally; will sync automatically when connected.',
      });
      noticeTimerRef.current = window.setTimeout(() => setSyncNotice(null), 4500);
      return;
    }

    const outcome = await flushResultsQueueNow(true);
    setSyncNotice({
      type: outcome.ok ? 'ok' : 'warn',
      text: outcome.message,
    });
    noticeTimerRef.current = window.setTimeout(() => setSyncNotice(null), 4500);
  };

  const studentLabel = studentIdentity
    ? `${studentIdentity.fullName} (${studentIdentity.section})`
    : 'Set Name & Section';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#dbe9f4] bg-[#ffffff]/95 backdrop-blur-md shadow-[0_2px_12px_-4px_rgba(31,58,86,0.08)]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand Title + Home */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 sm:gap-2.5 text-left group cursor-pointer focus:outline-none shrink-0"
            aria-label="Go to I-LAB home"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Atom className="w-4.5 h-4.5 sm:w-6 sm:h-6 animate-spin-slow" />
            </div>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#1f3a56] block leading-none whitespace-nowrap">
              I-LAB
            </span>
          </button>

          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer whitespace-nowrap"
            aria-label="Return to Compound Library"
            title="Home"
          >
            <Home className="w-3.5 h-3.5 text-[#0284c7]" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <OfflineIndicator />
          <PWAInstallButton />

          {/* Manual Sync Button */}
          <button
            type="button"
            data-testid="header-sync-btn"
            onClick={() => void handleManualSync()}
            disabled={isFlushingQueue}
            title={
              sheetsConfigured
                ? queuedResults.length > 0
                  ? `Sync ${queuedResults.length} queued score(s) to Google Sheets`
                  : 'Check connection and sync saved results'
                : 'Google Sheets sync is not configured yet'
            }
            className={`inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
              queuedResults.length > 0
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-[#f4f9fe] hover:bg-[#e8f3fd] border-[#dbe9f4] text-[#1f3a56]'
            }`}
            aria-label="Sync results"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#0284c7] shrink-0 ${
                isFlushingQueue ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {isFlushingQueue ? 'Syncing' : 'Sync'}
            </span>
            {queuedResults.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-950 text-[10px] font-extrabold">
                {queuedResults.length}
              </span>
            )}
          </button>

          {/* Badges counter */}
          <div
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] text-xs font-semibold text-[#1f3a56] border border-[#dbe9f4] whitespace-nowrap shrink-0"
            title={`${unlockedBadgesCount} of ${badges.length} badges unlocked`}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {unlockedBadgesCount} / {badges.length}
            </span>
          </div>

          {/* Student Name & Section Pill */}
          <button
            type="button"
            data-guide-id="header-signin"
            data-testid="header-student-btn"
            onClick={openIdentityModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] text-xs font-bold text-[#1f3a56] transition cursor-pointer whitespace-nowrap max-w-[100px] sm:max-w-[200px] min-w-0"
            title={studentIdentity ? `Student: ${studentLabel} (click to edit)` : 'Enter your name and section'}
          >
            <User className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
            <span className="truncate">{studentLabel}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl text-[#1f3a56] hover:text-[#0284c7] bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] transition cursor-pointer shrink-0"
            aria-label="Open customization settings"
            title="Settings & Appearance"
          >
            <SettingsIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Sync Result Feedback Bar */}
      {syncNotice && (
        <div
          role="status"
          className={`text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-t ${
            syncNotice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {syncNotice.type === 'ok' ? (
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
          )}
          <span className="font-medium">{syncNotice.text}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Dismiss sync notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
    </header>
  );
};
