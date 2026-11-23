import React, { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGuide } from '../../context/GuideContext';
import {
  X,
  Sliders,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Info,
  Download,
  Crosshair,
  Compass,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserSettings } from '../../types/chemistry';
import { GuideAnimationLevel, GuideCorner, GuideSize } from '../../types/guide';
import { isVoiceLikelyMale } from '../../engine/guideVoice';
import {
  checkSheetsConnection,
  ConnectionCheckResult,
  formatSecretCharsLabel,
} from '../../services/sheetsClient';
import {
  APP_BUILD_DATE,
  APP_VERSION,
  checkForAppUpdate,
  getEffectiveUpdateUrl,
  isOfflineFileCopy,
  UpdateCheckResult,
} from '../../config/appInfo';
import { OfflineDownloadCard } from '../common/OfflineDownloadCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const {
    guideSettings,
    updateGuideSettings,
    availableVoices,
    hasOfflineVoice,
    speechSupported,
    prefersReducedMotion,
    setCalibrateModalOpen,
    startTour,
    speakText,
  } = useGuide();
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionCheckResult | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunConnectionCheck = async () => {
    setCheckingConnection(true);
    try {
      const res = await checkSheetsConnection();
      setConnectionResult(res);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const res = await checkForAppUpdate(getEffectiveUpdateUrl(), APP_VERSION);
      setUpdateResult(res);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const accentOptions: { id: UserSettings['accentColor']; name: string; color: string }[] = [
    { id: 'indigo', name: 'Indigo', color: '#6366f1' },
    { id: 'blue', name: 'Blue', color: '#2563eb' },
    { id: 'emerald', name: 'Emerald', color: '#059669' },
    { id: 'amber', name: 'Amber', color: '#d97706' },
    { id: 'rose', name: 'Rose', color: '#e11d48' },
    { id: 'teal', name: 'Teal', color: '#0d9488' },
    { id: 'violet', name: 'Violet', color: '#7c3aed' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live changes update immediately and persist locally.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Theme Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Color Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'light', label: '☀️ Light' },
              { id: 'dark', label: '🌙 Dark' },
              { id: 'sepia', label: '📜 Sepia' },
              { id: 'high-contrast', label: '👁️ High Contrast' },
              { id: 'system', label: '💻 Follow Device' },
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => updateSettings({ theme: th.id as UserSettings['theme'] })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  settings.theme === th.id
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Accent Color Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Accent Brand Color
          </label>
          <div className="flex flex-wrap gap-2.5">
            {accentOptions.map((acc) => (
              <button
                key={acc.id}
                onClick={() => updateSettings({ accentColor: acc.id })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  settings.accentColor === acc.id
                    ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110'
                    : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: acc.color }}
                title={acc.name}
                aria-label={`Select ${acc.name} accent`}
              >
                {settings.accentColor === acc.id && (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Typography & Font Family */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Font Family
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'system', label: 'System (Clean Sans)' },
              { id: 'serif', label: 'Serif (Academic)' },
              { id: 'mono', label: 'Monospace (Technical)' },
              { id: 'dyslexic', label: 'Dyslexia Friendly' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => updateSettings({ fontFamily: f.id as UserSettings['fontFamily'] })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer text-left ${
                  settings.fontFamily === f.id
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Font Size & Layout Density */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Base Font Size
            </label>
            <div className="flex gap-1">
              {[
                { id: 'sm', label: 'S' },
                { id: 'md', label: 'M' },
                { id: 'lg', label: 'L' },
                { id: 'xl', label: 'XL' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateSettings({ fontSize: s.id as UserSettings['fontSize'] })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    settings.fontSize === s.id
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Layout Density
            </label>
            <div className="flex gap-1">
              {[
                { id: 'compact', label: 'Compact' },
                { id: 'comfortable', label: 'Normal' },
                { id: 'spacious', label: 'Spacious' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => updateSettings({ density: d.id as UserSettings['density'] })}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    settings.density === d.id
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Corner Roundness */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Corner Roundness
          </label>
          <div className="flex gap-2">
            {[
              { id: 'sharp', label: 'Sharp' },
              { id: 'rounded', label: 'Rounded' },
              { id: 'soft', label: 'Soft Pill' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => updateSettings({ cornerRoundness: r.id as UserSettings['cornerRoundness'] })}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  settings.cornerRoundness === r.id
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Toggles: Subscripts, Animations, Hints */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Real Subscripts (H₂SO₄ vs H2SO4)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Render numbers lowered as chemical subscripts.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.realSubscripts}
              onChange={(e) => updateSettings({ realSubscripts: e.target.checked })}
              className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                UI Motion & Animations
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Smooth transitions and feedback effects.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.animations}
              onChange={(e) => updateSettings({ animations: e.target.checked })}
              className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                Practice Hints
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Allow toggling helpful chemistry hints during quizzes.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.hintsEnabled}
              onChange={(e) => updateSettings({ hintsEnabled: e.target.checked })}
              className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
            />
          </label>
        </div>

        {/* 7. Passing Score Slider */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Practice Passing Threshold:</span>
            <span className="text-sky-600 dark:text-sky-400 text-sm font-mono font-black">
              {settings.passingScore}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={90}
            step={5}
            value={settings.passingScore}
            onChange={(e) => updateSettings({ passingScore: Number(e.target.value) })}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>50% (Gentle)</span>
            <span>70% (Standard)</span>
            <span>90% (Strict)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Syncs with your class Settings sheet on sign-in and reconnect.
          </p>
        </div>

        {/* 7B. Virtual Guide & Voice Settings */}
        <div
          data-guide-id="settings-guide"
          className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                Virtual Guide &amp; Voice
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Offline-capable animated teacher guide, live captions, and speech settings.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCalibrateModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Calibrate guide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  startTour('settings');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-sky-500" />
                <span>Tour</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Guide on/off
              </span>
              <input
                type="checkbox"
                checked={guideSettings.guideEnabled}
                onChange={(e) => updateGuideSettings({ guideEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Voice on/off
              </span>
              <input
                type="checkbox"
                checked={guideSettings.voiceEnabled}
                onChange={(e) => updateGuideSettings({ voiceEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Live captions
              </span>
              <input
                type="checkbox"
                checked={guideSettings.captionsEnabled}
                onChange={(e) => updateGuideSettings({ captionsEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Welcome message on startup
              </span>
              <input
                type="checkbox"
                checked={guideSettings.welcomeOnStartup}
                onChange={(e) => updateGuideSettings({ welcomeOnStartup: e.target.checked })}
                className="w-5 h-5 rounded accent-sky-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Layout Corner, Size, Animation Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase block">
                Corner
              </span>
              <select
                value={guideSettings.corner}
                onChange={(e) => updateGuideSettings({ corner: e.target.value as GuideCorner })}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase block">
                Card Size
              </span>
              <select
                value={guideSettings.size}
                onChange={(e) => updateGuideSettings({ size: e.target.value as GuideSize })}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase block">
                Animation
              </span>
              <select
                value={guideSettings.animationLevel}
                onChange={(e) =>
                  updateGuideSettings({ animationLevel: e.target.value as GuideAnimationLevel })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="full">Full (Lip Sync)</option>
                <option value="simple">Simple Ring</option>
                <option value="still">Still Photo</option>
              </select>
            </div>
          </div>

          {prefersReducedMotion && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-2 rounded-xl">
              Device reduced-motion is turned on, so the guide automatically uses the simple still mode.
            </p>
          )}

          {/* Voice Picker & Sliders */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="guide-voice-select"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Speech Voice ({availableVoices.length} detected)
              </label>
              <button
                type="button"
                onClick={() => updateGuideSettings({ muted: !guideSettings.muted })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  guideSettings.muted
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {guideSettings.muted ? (
                  <>
                    <VolumeX className="w-3 h-3" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    <span>Unmuted</span>
                  </>
                )}
              </button>
            </div>

            {speechSupported && availableVoices.length > 0 ? (
              <select
                id="guide-voice-select"
                value={guideSettings.voiceURI}
                onChange={(e) => updateGuideSettings({ voiceURI: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100"
              >
                <option value="">Automatic Clear Manly Voice (Slow &amp; Deep)</option>
                {availableVoices.map((v, idx) => (
                  <option
                    key={`${v.voiceURI}::${v.name}::${v.lang}::${idx}`}
                    value={v.voiceURI}
                  >
                    {v.name} ({v.lang})
                    {isVoiceLikelyMale(v) ? ' • Manly / Clear' : ''}
                    {v.localService ? ' • Offline' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                No offline speech voices were found in this browser. Live captions and visual guide sync remain active.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  speakText(
                    'Hello! Fe₂S₃ is iron (III) sulfide. Check oxidation numbers and balance the charges clearly.'
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold transition cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                <span>Test Voice</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  updateGuideSettings({
                    voiceURI: '',
                    rate: 0.85,
                    pitch: 0.84,
                    volume: 1.0,
                    muted: false,
                    voiceEnabled: true,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Slower Manly Default</span>
              </button>
            </div>

            {speechSupported && availableVoices.length > 0 && !hasOfflineVoice && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Installed voices may require an internet connection; live captions still work anytime offline.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                  <span>Speed</span>
                  <span>{guideSettings.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.3}
                  step={0.01}
                  value={guideSettings.rate}
                  onChange={(e) => updateGuideSettings({ rate: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                  <span>Pitch (Manly)</span>
                  <span>{guideSettings.pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.15}
                  step={0.01}
                  value={guideSettings.pitch}
                  onChange={(e) => updateGuideSettings({ pitch: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                  <span>Volume</span>
                  <span>{Math.round(guideSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={guideSettings.volume}
                  onChange={(e) => updateGuideSettings({ volume: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Virtual guide animated locally from the teacher&apos;s photo (not a live person). Never uploaded or downloadable.
          </p>
        </div>

        {/* 8. Google Sheets Connection Diagnostic */}
        <div
          data-guide-id="settings-sheets"
          className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Google Sheet Backend
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Verify that your app secret matches Code.gs without revealing it.
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleRunConnectionCheck()}
              disabled={checkingConnection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingConnection ? 'animate-spin' : ''}`} />
              <span>{checkingConnection ? 'Checking...' : 'Connection check'}</span>
            </button>
          </div>

          {connectionResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                connectionResult.status === 'Secret matches'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : connectionResult.status === 'Secret does not match' ||
                    connectionResult.status === 'No secret received'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {connectionResult.status === 'Secret matches' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : connectionResult.status === 'Cannot reach script' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span>{connectionResult.status}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-white/60 dark:bg-slate-900/50 rounded-xl p-2.5 border border-black/5 dark:border-white/5">
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-sans">App sends length</span>
                  <strong>{connectionResult.sentLength} chars</strong>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-sans">First / last char</span>
                  <strong>
                    {formatSecretCharsLabel({
                      length: connectionResult.sentLength,
                      firstChar: connectionResult.firstChar,
                      lastChar: connectionResult.lastChar,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-sans">Script expects</span>
                  <strong>
                    {connectionResult.expectedLength !== null
                      ? `${connectionResult.expectedLength} chars`
                      : 'Unavailable'}
                  </strong>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed">{connectionResult.detail}</p>
            </div>
          )}
        </div>

        {/* 9. About this copy & Check for updates */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-500" />
                About this copy
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Version v{APP_VERSION} • Built {APP_BUILD_DATE} •{' '}
                {isOfflineFileCopy() ? 'Offline File Copy' : 'Hosted Web App'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleCheckForUpdates()}
              disabled={checkingUpdate || !isOnline}
              title={
                isOnline
                  ? 'Check online for a newer copy of this app'
                  : 'Connect to the internet to check for updates'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Checking...' : 'Check for updates'}</span>
            </button>
          </div>

          {!isOnline && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              You are offline. Connect to the internet to check for updates.
            </p>
          )}

          {updateResult && (
            <div
              className={`p-3 rounded-2xl border text-xs space-y-2 ${
                updateResult.status === 'update-available'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200'
                  : updateResult.status === 'up-to-date'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <p className="font-medium">{updateResult.message}</p>
              {updateResult.downloadUrl && (
                <a
                  href={updateResult.downloadUrl}
                  download={
                    updateResult.downloadUrl.toLowerCase().includes('.html')
                      ? 'compound-naming-guide.html'
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download {updateResult.latestVersion ? `v${updateResult.latestVersion}` : 'Latest File'}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* 10. Download & Share this file */}
        <OfflineDownloadCard variant="settings" />

        {/* Reset & Done Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={resetSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Defaults
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
