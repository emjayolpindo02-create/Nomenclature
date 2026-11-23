import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { isOfflineFileCopy } from '../../config/appInfo';
import { useProgress } from '../../context/ProgressContext';
import { usePwaStatus } from '../../utils/pwaStatus';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { isSyncingQueue } = useProgress();
  const { offlineReady } = usePwaStatus();
  const offlineCopy = isOfflineFileCopy();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && isSyncingQueue) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold border border-sky-500/30 whitespace-nowrap"
          title="Syncing scores with Google Sheets"
          aria-label="Syncing..."
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>Syncing...</span>
        </span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 whitespace-nowrap"
          title="Offline — app works locally and saves scores as pending"
          aria-label="Offline"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline</span>
        </span>
      </div>
    );
  }

  if (offlineReady || offlineCopy) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/25 whitespace-nowrap"
          title={
            offlineCopy
              ? 'Offline ready — single-file copy works with no internet'
              : 'Offline ready — cached for offline use and ready to sync'
          }
          aria-label="Offline ready"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Offline ready</span>
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/25 whitespace-nowrap"
        title="Online — ready to sync scores"
        aria-label="Online"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <Wifi className="w-3.5 h-3.5 shrink-0" />
        <span>Online</span>
      </span>
    </div>
  );
};
