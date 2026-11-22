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
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/25 whitespace-nowrap"
          title="Online — ready to sync scores"
          aria-label="Online"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>Online</span>
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 whitespace-nowrap"
          title="Offline — app works locally and saves scores as pending"
          aria-label="Offline"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline</span>
        </span>
      )}
    </div>
  );
};
