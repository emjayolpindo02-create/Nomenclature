/**
 * Single shared Google Sheets + Apps Script configuration.
 * Reads VITE_APPS_SCRIPT_URL and VITE_APPS_SCRIPT_SECRET exclusively from environment variables.
 */

export function cleanEnvValue(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[\r\n]+/g, '').trim() : '';
}

export function isValidAppsScriptExecUrl(url: string): boolean {
  const cleaned = cleanEnvValue(url);
  if (!cleaned) return false;
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'https:' && /\/exec$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getSafeSecretSummary(secret: string): {
  length: number;
  firstChar: string;
  lastChar: string;
} {
  const cleaned = cleanEnvValue(secret);
  if (!cleaned) {
    return { length: 0, firstChar: '', lastChar: '' };
  }
  return {
    length: cleaned.length,
    firstChar: cleaned.charAt(0),
    lastChar: cleaned.charAt(cleaned.length - 1),
  };
}

const viteEnv: Record<string, unknown> =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env === 'object' &&
  import.meta.env !== null
    ? (import.meta.env as Record<string, unknown>)
    : {};

export const SHEETS_CONFIG = {
  scriptUrl: cleanEnvValue(viteEnv.VITE_APPS_SCRIPT_URL),
  appSecret: cleanEnvValue(viteEnv.VITE_APPS_SCRIPT_SECRET),
  clockDriftToleranceMs: 60 * 1000,
  defaultSessionExpiryDays: 60,
} as const;

export function isSheetsConfigured(): boolean {
  return isValidAppsScriptExecUrl(SHEETS_CONFIG.scriptUrl) && SHEETS_CONFIG.appSecret.length > 0;
}
