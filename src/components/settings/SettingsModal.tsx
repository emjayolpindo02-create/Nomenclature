import React, { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGuide } from '../../context/GuideContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Sliders,
  RotateCcw,
  Info,
  Crosshair,
  Compass,
  Volume2,
  VolumeX,
  GraduationCap,
} from 'lucide-react';
import { UserSettings } from '../../types/chemistry';
import { GuideAnimationLevel, GuideCorner, GuideSize } from '../../types/guide';
import { isVoiceLikelyMale } from '../../engine/guideVoice';
import { APP_BUILD_DATE, APP_VERSION, isOfflineFileCopy } from '../../config/appInfo';
import { OfflineDownloadCard } from '../common/OfflineDownloadCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTeacherPortal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenTeacherPortal,
}) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { isTeacher, openSignInModal } = useAuth();
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

  const accentOptions: { id: UserSettings['accentColor']; name: string; color: string }[] = [
    { id: 'blue', name: 'Sky Blue', color: '#0284c7' },
    { id: 'indigo', name: 'Royal Blue', color: '#2563eb' },
    { id: 'teal', name: 'Cyan Teal', color: '#0d9488' },
    { id: 'violet', name: 'Periwinkle', color: '#3b82f6' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 sm:p-8 space-y-6 relative text-[#1f3a56]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dbe9f4] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#0284c7] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1f3a56]">Settings</h3>
              <p className="text-xs text-[#3b5775]">
                Changes update immediately and persist safely on this device.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#3b5775] hover:bg-[#f4f9fe] transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Light Background Tint */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider block">
            Page Tint
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sky', label: 'Crisp White' },
              { id: 'cream', label: 'Warm White' },
              { id: 'mint', label: 'Soft Tint' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => updateSettings({ theme: th.id as UserSettings['theme'] })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  settings.theme === th.id
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm'
                    : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Accent Color Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider block">
            Accent Shade
          </label>
          <div className="flex flex-wrap gap-2.5">
            {accentOptions.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => updateSettings({ accentColor: acc.id })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  settings.accentColor === acc.id
                    ? 'ring-2 ring-offset-2 ring-[#0284c7] scale-110'
                    : 'opacity-85 hover:opacity-100'
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

        {/* 3. Font Family */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider block">
            Font Family
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'system', label: 'Fredoka + Poppins (Default)' },
              { id: 'serif', label: 'Serif (Academic)' },
              { id: 'mono', label: 'Monospace (Technical)' },
              { id: 'dyslexic', label: 'Dyslexia Friendly' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updateSettings({ fontFamily: f.id as UserSettings['fontFamily'] })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer text-left ${
                  settings.fontFamily === f.id
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm'
                    : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
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
            <label className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider block">
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
                  type="button"
                  onClick={() => updateSettings({ fontSize: s.id as UserSettings['fontSize'] })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    settings.fontSize === s.id
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider block">
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
                  type="button"
                  onClick={() => updateSettings({ density: d.id as UserSettings['density'] })}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    settings.density === d.id
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Toggles */}
        <div className="space-y-3 pt-2 border-t border-[#dbe9f4]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1f3a56] block">
                Real Subscripts (H₂SO₄ vs H2SO4)
              </span>
              <span className="text-xs text-[#3b5775]">
                Render numbers lowered as chemical subscripts.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.realSubscripts}
              onChange={(e) => updateSettings({ realSubscripts: e.target.checked })}
              className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1f3a56] block">
                UI Motion &amp; Animations
              </span>
              <span className="text-xs text-[#3b5775]">
                Smooth transitions and orbiting atom backdrop.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.animations}
              onChange={(e) => updateSettings({ animations: e.target.checked })}
              className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-[#1f3a56] block">
                Practice Hints
              </span>
              <span className="text-xs text-[#3b5775]">
                Allow toggling helpful chemistry hints during quizzes.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.hintsEnabled}
              onChange={(e) => updateSettings({ hintsEnabled: e.target.checked })}
              className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
            />
          </label>
        </div>

        {/* 6. Virtual Guide & Voice Settings */}
        <div
          data-guide-id="settings-guide"
          className="space-y-4 pt-3 border-t border-[#dbe9f4]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#0284c7]" />
                Virtual Guide &amp; Voice
              </span>
              <span className="text-[11px] text-[#3b5775] block">
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Calibrate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  startTour('settings');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] text-[#1f3a56] border border-[#dbe9f4] text-xs font-semibold transition cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>Tour</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-[#1f3a56]">Guide on/off</span>
              <input
                type="checkbox"
                checked={guideSettings.guideEnabled}
                onChange={(e) => updateGuideSettings({ guideEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-[#1f3a56]">Voice on/off</span>
              <input
                type="checkbox"
                checked={guideSettings.voiceEnabled}
                onChange={(e) => updateGuideSettings({ voiceEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-[#1f3a56]">Live captions</span>
              <input
                type="checkbox"
                checked={guideSettings.captionsEnabled}
                onChange={(e) => updateGuideSettings({ captionsEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-[#0284c7] cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase block">Corner</span>
              <select
                value={guideSettings.corner}
                onChange={(e) => updateGuideSettings({ corner: e.target.value as GuideCorner })}
                className="w-full px-2.5 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase block">
                Card Size
              </span>
              <select
                value={guideSettings.size}
                onChange={(e) => updateGuideSettings({ size: e.target.value as GuideSize })}
                className="w-full px-2.5 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
              >
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase block">
                Animation
              </span>
              <select
                value={guideSettings.animationLevel}
                onChange={(e) =>
                  updateGuideSettings({ animationLevel: e.target.value as GuideAnimationLevel })
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
              >
                <option value="full">Full (Lip Sync)</option>
                <option value="simple">Simple Ring</option>
                <option value="still">Still Photo</option>
              </select>
            </div>
          </div>

          {prefersReducedMotion && (
            <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
              Device reduced-motion is turned on, so the guide automatically uses still mode.
            </p>
          )}

          {/* Voice Picker & Sliders */}
          <div className="p-3.5 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="guide-voice-select" className="text-xs font-bold text-[#1f3a56]">
                Speech Voice ({availableVoices.length} detected)
              </label>
              <button
                type="button"
                onClick={() => updateGuideSettings({ muted: !guideSettings.muted })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  guideSettings.muted
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
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
                className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#dbe9f4] text-xs text-[#1f3a56]"
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
              <p className="text-[11px] text-amber-900">
                No offline speech voices were found in this browser. Live captions remain active.
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold transition cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#f4f9fe] text-[#1f3a56] text-[11px] font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Slower Manly Default</span>
              </button>
            </div>

            {speechSupported && availableVoices.length > 0 && !hasOfflineVoice && (
              <p className="text-[11px] text-amber-900">
                Installed voices may require an internet connection; live captions work anytime offline.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="flex justify-between font-semibold text-[#1f3a56]">
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
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#1f3a56]">
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
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#1f3a56]">
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
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 7. Teacher Access & App Info */}
        <div className="space-y-3 pt-2 border-t border-[#dbe9f4]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#1f3a56] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#0284c7]" />
                App Copy &amp; Teacher Portal
              </span>
              <span className="text-[11px] text-[#3b5775] block mt-0.5">
                Version v{APP_VERSION} • Built {APP_BUILD_DATE} •{' '}
                {isOfflineFileCopy() ? 'Offline File Copy' : 'Hosted Web App'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (isTeacher && onOpenTeacherPortal) {
                  onOpenTeacherPortal();
                } else {
                  openSignInModal({ mode: 'teacher' });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-[#0284c7]" />
              <span>{isTeacher ? 'Teacher Dashboard' : 'Teacher Sign In'}</span>
            </button>
          </div>
        </div>

        {/* 8. Download Single HTML File */}
        <OfflineDownloadCard variant="settings" />

        {/* Reset & Done Footer */}
        <div className="pt-4 border-t border-[#dbe9f4] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ffffff] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56] hover:bg-[#f4f9fe] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0284c7]" />
            Restore Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
