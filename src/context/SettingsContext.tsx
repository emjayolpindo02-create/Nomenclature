import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSettings } from '../types/chemistry';
import { useAuth } from './AuthContext';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  accentColor: 'indigo',
  fontFamily: 'system',
  fontSize: 'md',
  density: 'comfortable',
  cornerRoundness: 'rounded',
  animations: true,
  realSubscripts: true,
  periodicColorBy: 'category',
  hintsEnabled: true,
  passingScore: 70,
};

const LEGACY_STORAGE_KEY = 'compound_naming_guide_settings_v1';

function getStorageKey(username: string | undefined): string {
  return username ? `ilab_settings_v2_${username.toLowerCase()}` : 'ilab_settings_v2_guest';
}

function loadSettingsForUser(username: string | undefined): UserSettings {
  try {
    const stored = localStorage.getItem(getStorageKey(username));
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Could not read settings from localStorage:', e);
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
  const { user, sectionPolicy } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => loadSettingsForUser(undefined));

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Load user-scoped settings when signed-in username changes
  useEffect(() => {
    const loaded = loadSettingsForUser(user?.username);
    setSettings({
      ...loaded,
      passingScore: sectionPolicy.passingScore || loaded.passingScore,
    });
  }, [user?.username, sectionPolicy.passingScore]);

  const persistSettings = (updated: UserSettings) => {
    try {
      localStorage.setItem(getStorageKey(user?.username), JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save settings to localStorage:', e);
    }
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      persistSettings(updated);
      return updated;
    });
  };

  const resetSettings = () => {
    const resetVal: UserSettings = {
      ...DEFAULT_SETTINGS,
      passingScore: sectionPolicy.passingScore || DEFAULT_SETTINGS.passingScore,
    };
    setSettings(resetVal);
    persistSettings(resetVal);
  };

  // Apply CSS variables and classes to document root for instant live preview
  useEffect(() => {
    const root = document.documentElement;

    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-high-contrast', 'dark');

    if (effectiveTheme === 'dark') {
      root.classList.add('theme-dark', 'dark');
      root.style.setProperty('--bg-main', '#0f172a');
      root.style.setProperty('--bg-card', '#1e293b');
      root.style.setProperty('--bg-card-subtle', '#334155');
      root.style.setProperty('--border-color', '#334155');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-muted', '#64748b');
    } else if (effectiveTheme === 'sepia') {
      root.classList.add('theme-sepia');
      root.style.setProperty('--bg-main', '#fbf0d9');
      root.style.setProperty('--bg-card', '#f4e3c1');
      root.style.setProperty('--bg-card-subtle', '#ead2a8');
      root.style.setProperty('--border-color', '#d9bd8f');
      root.style.setProperty('--text-primary', '#3e2723');
      root.style.setProperty('--text-secondary', '#5d4037');
      root.style.setProperty('--text-muted', '#8d6e63');
    } else if (effectiveTheme === 'high-contrast') {
      root.classList.add('theme-high-contrast', 'dark');
      root.style.setProperty('--bg-main', '#000000');
      root.style.setProperty('--bg-card', '#121212');
      root.style.setProperty('--bg-card-subtle', '#242424');
      root.style.setProperty('--border-color', '#ffffff');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e0e0e0');
      root.style.setProperty('--text-muted', '#b0b0b0');
    } else {
      root.classList.add('theme-light');
      root.style.setProperty('--bg-main', '#f8fafc');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-subtle', '#f1f5f9');
      root.style.setProperty('--border-color', '#e2e8f0');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#94a3b8');
    }

    const accentColors: Record<string, { primary: string; hover: string; light: string; border: string }> = {
      indigo: { primary: '#6366f1', hover: '#4f46e5', light: 'rgba(99, 102, 241, 0.15)', border: '#818cf8' },
      blue: { primary: '#2563eb', hover: '#1d4ed8', light: 'rgba(37, 99, 235, 0.15)', border: '#60a5fa' },
      emerald: { primary: '#059669', hover: '#047857', light: 'rgba(5, 150, 105, 0.15)', border: '#34d399' },
      amber: { primary: '#d97706', hover: '#b45309', light: 'rgba(217, 119, 6, 0.15)', border: '#fbbf24' },
      rose: { primary: '#e11d48', hover: '#be123c', light: 'rgba(225, 29, 72, 0.15)', border: '#fb7185' },
      teal: { primary: '#0d9488', hover: '#0f766e', light: 'rgba(13, 148, 136, 0.15)', border: '#2dd4bf' },
      violet: { primary: '#7c3aed', hover: '#6d28d9', light: 'rgba(124, 58, 237, 0.15)', border: '#a78bfa' },
    };
    const currentAccent = accentColors[settings.accentColor] || accentColors.indigo;
    root.style.setProperty('--accent-color', currentAccent.primary);
    root.style.setProperty('--accent-hover', currentAccent.hover);
    root.style.setProperty('--accent-light', currentAccent.light);
    root.style.setProperty('--accent-border', currentAccent.border);

    if (settings.fontFamily === 'serif') {
      root.style.setProperty('--app-font', 'Georgia, Cambria, "Times New Roman", Times, serif');
    } else if (settings.fontFamily === 'mono') {
      root.style.setProperty('--app-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');
    } else if (settings.fontFamily === 'dyslexic') {
      root.style.setProperty('--app-font', 'Comic Sans MS, "Trebuchet MS", Verdana, sans-serif');
    } else {
      root.style.setProperty('--app-font', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
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
