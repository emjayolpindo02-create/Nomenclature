import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSettings } from '../types/chemistry';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'sky',
  accentColor: 'blue',
  fontFamily: 'system',
  fontSize: 'md',
  density: 'comfortable',
  cornerRoundness: 'rounded',
  animations: true,
  realSubscripts: true,
  periodicColorBy: 'category',
  hintsEnabled: true,
  passingScore: 75,
};

const SETTINGS_STORAGE_KEY = 'ilab_settings_v3_local';
const LEGACY_GUEST_STORAGE_KEY = 'ilab_settings_v3_guest';
const LEGACY_STORAGE_KEY = 'compound_naming_guide_settings_v1';

function normalizeLightTheme(raw: unknown): UserSettings['theme'] {
  if (raw === 'cream' || raw === 'sepia') return 'cream';
  if (raw === 'mint') return 'mint';
  return 'sky';
}

function loadSettings(): UserSettings {
  try {
    const stored =
      safeGetItem(SETTINGS_STORAGE_KEY) ?? safeGetItem(LEGACY_GUEST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserSettings> & { theme?: unknown };
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: normalizeLightTheme(parsed.theme),
      };
    }
  } catch {
    // fallback safely
  }
  return DEFAULT_SETTINGS;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());

  useEffect(() => {
    safeRemoveItem(LEGACY_STORAGE_KEY);
  }, []);

  const persistSettings = (updated: UserSettings) => {
    safeSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        ...partial,
        theme: normalizeLightTheme(partial.theme ?? prev.theme),
      };
      persistSettings(updated);
      return updated;
    });
  };

  const resetSettings = () => {
    const resetVal: UserSettings = { ...DEFAULT_SETTINGS };
    setSettings(resetVal);
    persistSettings(resetVal);
  };

  // Apply bright white-forward palette CSS variables with navy ink & subtle blue accents
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = normalizeLightTheme(settings.theme);

    root.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-sepia',
      'theme-high-contrast',
      'dark',
      'theme-sky',
      'theme-cream',
      'theme-mint'
    );

    if (effectiveTheme === 'cream') {
      root.classList.add('theme-cream');
      root.style.setProperty('--bg-main', '#fdfcf9');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-subtle', '#f7f6f2');
      root.style.setProperty('--border-color', '#dbe9f4');
    } else if (effectiveTheme === 'mint') {
      root.classList.add('theme-mint');
      root.style.setProperty('--bg-main', '#f8fcfb');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-subtle', '#eff8f6');
      root.style.setProperty('--border-color', '#dbe9f4');
    } else {
      root.classList.add('theme-sky');
      root.style.setProperty('--bg-main', '#fbfdff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-subtle', '#f4f9fe');
      root.style.setProperty('--border-color', '#dbe9f4');
    }

    root.style.setProperty('--text-primary', '#1f3a56');
    root.style.setProperty('--text-secondary', '#3b5775');
    root.style.setProperty('--text-muted', '#526d88');

    const accentColors: Record<
      string,
      { primary: string; hover: string; light: string; border: string }
    > = {
      indigo: { primary: '#2563eb', hover: '#1d4ed8', light: 'rgba(37, 99, 235, 0.14)', border: '#60a5fa' },
      blue: { primary: '#0284c7', hover: '#0369a1', light: 'rgba(2, 132, 199, 0.14)', border: '#38bdf8' },
      emerald: { primary: '#0d9488', hover: '#0f766e', light: 'rgba(13, 148, 136, 0.14)', border: '#2dd4bf' },
      amber: { primary: '#0284c7', hover: '#0369a1', light: 'rgba(2, 132, 199, 0.14)', border: '#38bdf8' },
      rose: { primary: '#2563eb', hover: '#1d4ed8', light: 'rgba(37, 99, 235, 0.14)', border: '#60a5fa' },
      teal: { primary: '#0d9488', hover: '#0f766e', light: 'rgba(13, 148, 136, 0.14)', border: '#2dd4bf' },
      violet: { primary: '#3b82f6', hover: '#2563eb', light: 'rgba(59, 130, 246, 0.14)', border: '#60a5fa' },
    };
    const currentAccent = accentColors[settings.accentColor] || accentColors.blue;
    root.style.setProperty('--accent-color', currentAccent.primary);
    root.style.setProperty('--accent-hover', currentAccent.hover);
    root.style.setProperty('--accent-light', currentAccent.light);
    root.style.setProperty('--accent-border', currentAccent.border);

    if (settings.fontFamily === 'serif') {
      root.style.setProperty('--app-font', 'Georgia, Cambria, "Times New Roman", Times, serif');
      root.style.setProperty('--display-font', 'Georgia, Cambria, "Times New Roman", Times, serif');
    } else if (settings.fontFamily === 'mono') {
      root.style.setProperty('--app-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');
      root.style.setProperty('--display-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');
    } else if (settings.fontFamily === 'dyslexic') {
      root.style.setProperty('--app-font', 'Comic Sans MS, "Trebuchet MS", Verdana, sans-serif');
      root.style.setProperty('--display-font', '"Fredoka", Comic Sans MS, "Trebuchet MS", sans-serif');
    } else {
      root.style.setProperty('--app-font', '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      root.style.setProperty('--display-font', '"Fredoka", "Poppins", ui-rounded, "SF Pro Rounded", system-ui, sans-serif');
    }

    const sizeMap = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
    root.style.setProperty('--base-font-size', sizeMap[settings.fontSize]);

    const densityPad = { compact: '6px', comfortable: '12px', spacious: '18px' };
    root.style.setProperty('--density-padding', densityPad[settings.density]);

    const radiusMap = { sharp: '0px', rounded: '8px', soft: '16px' };
    root.style.setProperty('--app-radius', radiusMap[settings.cornerRoundness]);

    if (!settings.animations) {
      root.style.setProperty('--transition-speed', '0s');
      root.classList.add('no-animations');
    } else {
      root.style.setProperty('--transition-speed', '0.2s');
      root.classList.remove('no-animations');
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside a SettingsProvider');
  return ctx;
};
