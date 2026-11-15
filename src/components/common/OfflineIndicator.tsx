import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      {isOnline ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20 whitespace-nowrap"
          title="App is precached and runs completely offline"
          aria-label="Offline Ready"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Offline Ready</span>
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/30 whitespace-nowrap"
          title="Currently working completely offline from local cache"
          aria-label="Offline Mode Active"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Offline Mode Active</span>
        </span>
      )}
    </div>
  );
};
