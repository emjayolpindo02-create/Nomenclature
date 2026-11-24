import { cleanEnvValue } from '../config/appInfo';
import { QueuedTopicResult } from '../types/chemistry';

const PLACEHOLDER_SECRETS = new Set([
  'PASTE_YOUR_SECRET_HERE',
  'PASTE_SECRET_HERE',
  'MY_APP_SECRET',
  'YOUR_SECRET_HERE',
]);

const PLACEHOLDER_URLS = new Set([
  'PASTE_YOUR_APPS_SCRIPT_URL_HERE',
  'https://.../exec',
]);

export interface SheetsConfig {
  url: string;
  secret: string;
}

export interface SheetsConnectionResult {
  ok: boolean;
  configured: boolean;
  secretMatches: boolean;
  status: 'connected' | 'unconfigured' | 'offline' | 'unauthorized' | 'error';
  message: string;
  secretLabel: string;
  urlPreview: string;
}

export interface TopicResultPayload {
  resultId: string;
  name: string;
  section: string;
  topicId: string;
  topic: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: 'yes' | 'no';
  date: string;
  time: string;
  dateTime: string;
}

export interface SendResultResponse {
  ok: boolean;
  unconfigured?: boolean;
  offline?: boolean;
  updated?: boolean;
  added?: boolean;
  error?: string;
}

function readViteEnv(): Record<string, unknown> {
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof import.meta.env === 'object' &&
      import.meta.env !== null
    ) {
      return import.meta.env as Record<string, unknown>;
    }
  } catch {
    // ignore outside Vite
  }
  return {};
}

export function normalizeAppsScriptUrl(rawUrl: unknown): string {
  const cleaned = cleanEnvValue(rawUrl);
  if (!cleaned || PLACEHOLDER_URLS.has(cleaned)) return '';
  return cleaned;
}

export function normalizeAppsScriptSecret(rawSecret: unknown): string {
  const cleaned = cleanEnvValue(rawSecret).replace(/[\r\n]+/g, '').trim();
  if (!cleaned || PLACEHOLDER_SECRETS.has(cleaned)) return '';
  return cleaned;
}

export function getSheetsConfig(
  overrideUrl?: string,
  overrideSecret?: string
): SheetsConfig {
  const env = readViteEnv();
  const url = normalizeAppsScriptUrl(
    overrideUrl !== undefined ? overrideUrl : env.VITE_APPS_SCRIPT_URL
  );
  const secret = normalizeAppsScriptSecret(
    overrideSecret !== undefined ? overrideSecret : env.VITE_APPS_SCRIPT_SECRET
  );
  return { url, secret };
}

export function isSheetsConfigured(
  overrideUrl?: string,
  overrideSecret?: string
): boolean {
  const { url, secret } = getSheetsConfig(overrideUrl, overrideSecret);
  return Boolean(url && secret);
}

export function isValidAppsScriptExecUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /\/exec$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Formats a safe preview of the configured secret without ever exposing the full string.
 */
export function formatSecretCharsLabel(
  secret: string = getSheetsConfig().secret
): string {
  const clean = normalizeAppsScriptSecret(secret);
  if (!clean) return 'Not set';
  if (clean.length < 4) return `${clean.length} chars`;
  return `${clean.length} chars (${clean[0]}...${clean[clean.length - 1]})`;
}

export function formatUrlPreview(url: string = getSheetsConfig().url): string {
  const clean = normalizeAppsScriptUrl(url);
  if (!clean) return 'Not set';
  if (clean.length <= 44) return clean;
  return `${clean.slice(0, 28)}...${clean.slice(-14)}`;
}

/**
 * Formats date and time strings in Asia/Manila (UTC+8) without relying on ICU locale tables.
 */
export function formatResultDateTimeParts(ms: number = Date.now()): {
  date: string;
  time: string;
  dateTime: string;
} {
  const manilaMs = ms + 8 * 60 * 60 * 1000;
  const d = new Date(manilaMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const time = `${hours}:${minutes}:${seconds}`;
  return {
    date,
    time,
    dateTime: `${date} ${time}`,
  };
}

/**
 * Computes exponential backoff + random jitter so students finishing simultaneously
 * spread out automatic retries against the Apps Script Web App.
 */
export function computeRetryDelayMs(
  retryCount: number,
  randomFn: () => number = Math.random
): number {
  const safeCount = Math.max(0, Math.floor(retryCount));
  const baseMs = Math.min(60_000, 2_500 * Math.pow(2, safeCount));
  const r = Math.min(0.999, Math.max(0, randomFn()));
  const jitterMs = Math.round(500 + r * 3_500);
  return baseMs + jitterMs;
}

async function postPlainJson(
  url: string,
  bodyObj: unknown,
  fetchImpl: typeof fetch = fetch
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(bodyObj),
    redirect: 'follow',
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = { ok: false, error: text || `Unexpected response (HTTP ${res.status})` };
  }
  return { status: res.status, data: parsed };
}

export async function checkSheetsConnection(
  overrideUrl?: string,
  overrideSecret?: string,
  fetchImpl: typeof fetch = fetch
): Promise<SheetsConnectionResult> {
  const { url, secret } = getSheetsConfig(overrideUrl, overrideSecret);
  const secretLabel = formatSecretCharsLabel(secret);
  const urlPreview = formatUrlPreview(url);

  if (!url || !secret) {
    return {
      ok: false,
      configured: false,
      secretMatches: false,
      status: 'unconfigured',
      message: 'Google Sheets sync is off (VITE_APPS_SCRIPT_URL or VITE_APPS_SCRIPT_SECRET is empty).',
      secretLabel,
      urlPreview,
    };
  }

  if (!isValidAppsScriptExecUrl(url)) {
    return {
      ok: false,
      configured: true,
      secretMatches: false,
      status: 'error',
      message: 'Apps Script URL must be an https://.../exec Web App URL.',
      secretLabel,
      urlPreview,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      configured: true,
      secretMatches: false,
      status: 'offline',
      message: 'Device is offline. Queued results will sync automatically when connected.',
      secretLabel,
      urlPreview,
    };
  }

  try {
    const { status, data } = await postPlainJson(
      url,
      { action: 'ping', appSecret: secret },
      fetchImpl
    );

    if (status < 200 || status >= 300) {
      return {
        ok: false,
        configured: true,
        secretMatches: false,
        status: 'error',
        message: `Apps Script responded with HTTP ${status}.`,
        secretLabel,
        urlPreview,
      };
    }

    const secretMatches = Boolean(data.secretMatches);
    if (!secretMatches) {
      return {
        ok: false,
        configured: true,
        secretMatches: false,
        status: 'unauthorized',
        message: 'Connected to Apps Script, but VITE_APPS_SCRIPT_SECRET does not match APP_SECRET in Code.gs.',
        secretLabel,
        urlPreview,
      };
    }

    return {
      ok: true,
      configured: true,
      secretMatches: true,
      status: 'connected',
      message: 'Connected to Google Sheets and secret verified.',
      secretLabel,
      urlPreview,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      secretMatches: false,
      status: 'error',
      message:
        err instanceof Error && err.message
          ? `Could not reach Google Sheets: ${err.message}`
          : 'Could not reach Google Sheets.',
      secretLabel,
      urlPreview,
    };
  }
}

export async function sendResult(
  result: TopicResultPayload,
  options?: {
    url?: string;
    secret?: string;
    fetchImpl?: typeof fetch;
  }
): Promise<SendResultResponse> {
  const { url, secret } = getSheetsConfig(options?.url, options?.secret);
  if (!url || !secret) {
    return {
      ok: false,
      unconfigured: true,
      error: 'Google Sheets sync is turned off.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      offline: true,
      error: 'Device is offline.',
    };
  }

  try {
    const fetchImpl = options?.fetchImpl ?? fetch;
    const { status, data } = await postPlainJson(
      url,
      {
        action: 'saveResult',
        appSecret: secret,
        result,
      },
      fetchImpl
    );

    if (status < 200 || status >= 300 || !data.ok) {
      return {
        ok: false,
        error:
          typeof data.error === 'string' && data.error
            ? data.error
            : `Failed to save result (HTTP ${status}).`,
      };
    }

    return {
      ok: true,
      updated: Boolean(data.updated),
      added: Boolean(data.added),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error sending result.',
    };
  }
}

export async function sendResultsBatch(
  results: QueuedTopicResult[],
  options?: {
    url?: string;
    secret?: string;
    fetchImpl?: typeof fetch;
  }
): Promise<SendResultResponse> {
  if (results.length === 0) return { ok: true };

  const { url, secret } = getSheetsConfig(options?.url, options?.secret);
  if (!url || !secret) {
    return {
      ok: false,
      unconfigured: true,
      error: 'Google Sheets sync is turned off.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      offline: true,
      error: 'Device is offline.',
    };
  }

  try {
    const fetchImpl = options?.fetchImpl ?? fetch;
    const { status, data } = await postPlainJson(
      url,
      {
        action: 'saveResult',
        appSecret: secret,
        results: results.map((r) => ({
          resultId: r.queueId,
          name: r.name,
          section: r.section,
          topicId: r.topicId,
          topic: r.topic,
          score: r.score,
          correctCount: r.correctCount,
          totalQuestions: r.totalQuestions,
          passed: r.passed,
          date: r.date,
          time: r.time,
          dateTime: r.dateTime,
        })),
      },
      fetchImpl
    );

    if (status < 200 || status >= 300 || !data.ok) {
      return {
        ok: false,
        error:
          typeof data.error === 'string' && data.error
            ? data.error
            : `Batch sync failed (HTTP ${status}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error syncing results.',
    };
  }
}
