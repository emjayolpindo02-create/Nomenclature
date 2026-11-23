import React from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';
import {
  formatBytesSize,
  getOfflineDownloadUrl,
  isOfflineFileCopy,
  SINGLE_FILE_SIZE_BYTES,
} from '../../config/appInfo';

interface OfflineDownloadCardProps {
  variant?: 'home' | 'settings';
}

export const OfflineDownloadCard: React.FC<OfflineDownloadCardProps> = ({
  variant = 'home',
}) => {
  const offlineCopy = isOfflineFileCopy();
  const downloadUrl = getOfflineDownloadUrl();
  const sizeLabel = formatBytesSize(SINGLE_FILE_SIZE_BYTES);

  if (variant === 'settings') {
    return (
      <div className="space-y-3 pt-2 border-t border-[#dbe9f4]">
        {!offlineCopy && (
          <div className="p-4 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#0284c7]" />
                  Use Offline Anywhere
                </span>
                <span className="text-[11px] text-[#3b5775] block">
                  Single HTML file ({sizeLabel}) — works with no internet and no install needed.
                </span>
              </div>
              <a
                href={downloadUrl}
                download="compound-naming-guide.html"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download for offline use</span>
              </a>
            </div>
            <p className="text-[11px] text-[#3b5775]">
              Save the file, open it with Chrome, and add it to your home screen if you like.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            Share this file
          </span>
          <ol className="text-xs text-[#3b5775] space-y-1.5 pl-4 list-decimal leading-relaxed">
            <li>
              Send <code className="font-mono text-[11px]">compound-naming-guide.html</code> to a classmate via{' '}
              <strong>Messenger</strong>, <strong>Google Drive</strong>, <strong>USB</strong>, or{' '}
              <strong>Bluetooth</strong>.
            </li>
            <li>Save the file to your phone&apos;s Downloads folder or computer.</li>
            <li>
              Save the file, open it with Chrome, and add it to your home screen if you like.
            </li>
            <li>
              Everything works with zero internet, and each device keeps its own progress.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Offline download and sharing"
      className="p-5 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.08)] space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#1f3a56] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0284c7] shrink-0" />
              <span>{offlineCopy ? 'Offline File Copy' : 'Need this without internet?'}</span>
            </h3>
            {!offlineCopy && (
              <span className="px-2 py-0.5 rounded-md bg-[#f4f9fe] border border-[#dbe9f4] text-[#0284c7] text-[11px] font-mono font-semibold">
                {sizeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[#3b5775] leading-relaxed">
            {offlineCopy
              ? 'You are running the standalone offline file. Save it on any phone or computer, open it with Chrome, and add it to your home screen if you like.'
              : 'Save the file, open it with Chrome, and add it to your home screen if you like.'}
          </p>
        </div>

        {!offlineCopy && (
          <a
            href={downloadUrl}
            download="compound-naming-guide.html"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download for offline use</span>
          </a>
        )}
      </div>

      <div className="pt-2 border-t border-[#e8f1f8] flex items-start gap-2 text-[11px] text-[#3b5775]">
        <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#1f3a56]">Share this file:</strong> Send{' '}
          <code className="font-mono">compound-naming-guide.html</code> via Messenger, Google Drive, USB, or Bluetooth.
        </span>
      </div>
    </section>
  );
};
