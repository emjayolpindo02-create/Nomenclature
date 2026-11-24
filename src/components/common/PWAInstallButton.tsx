import React, { useEffect, useState } from 'react';
import { Download, Check, Share, X } from 'lucide-react';
import { isOfflineFileCopy } from '../../config/appInfo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const isOfflineCopy = isOfflineFileCopy();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (isOfflineCopy) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isOfflineCopy]);

  if (isOfflineCopy) {
    return null;
  }

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-300">
        <Check className="w-3.5 h-3.5" />
        Installed
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        aria-label="Install I-LAB app offline"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
          onClick={() => setShowIOSModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#ffffff] border border-[#dbe9f4] p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#3b5775] hover:bg-[#f4f9fe] hover:text-[#1f3a56] cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-center text-[#0284c7] mb-3">
              <Share className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1f3a56]">
              Install on iPhone or iPad
            </h3>
            <p className="mt-2 text-sm text-[#3b5775] space-y-2">
              <span className="block">
                1. Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 text-[#0284c7]" /> at the bottom of Safari.
              </span>
              <span className="block">
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </span>
              <span className="block">
                3. Tap <strong>Add</strong> in the top right corner.
              </span>
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
