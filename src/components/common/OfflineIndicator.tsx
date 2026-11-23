import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { isOfflineFileCopy } from '../../config/appInfo';
import { useProgress } from '../../context/ProgressContext';
import { usePwaStatus } from '../../utils/pwaStatus';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { isFlushingQueue } = useProgress();
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

  if (isOnline && isFlushingQueue) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-[#f4f9fe] text-[#0284c7] font-semibold border border-[#dbe9f4] whitespace-nowrap"
          title="Saving pending completions"
          aria-label="Saving..."
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span className="hidden sm:inline">Saving...</span>
        </span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 font-semibold border border-amber-200 whitespace-nowrap"
          title="Offline — built-in library and tools stay available locally"
          aria-label="Offline"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      </div>
    );
  }

  if (offlineReady || offlineCopy) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 whitespace-nowrap"
          title="Offline ready — built-in compound library works without internet"
          aria-label="Offline ready"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          <span className="hidden sm:inline">Offline ready</span>
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-[#ffffff] text-[#1f3a56] font-semibold border border-[#dbe9f4] whitespace-nowrap"
        title="Online"
        aria-label="Online"
      >
        <Wifi className="w-3.5 h-3.5 shrink-0 text-[#0284c7]" />
        <span className="hidden sm:inline">Online</span>
      </span>
    </div>
  );
};
