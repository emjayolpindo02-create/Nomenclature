import React, { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { X, Moon, Sun, Sliders, Type, Palette, Sparkles, RotateCcw } from 'lucide-react';
import { UserSettings } from '../../types/chemistry';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
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
        </div>

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
