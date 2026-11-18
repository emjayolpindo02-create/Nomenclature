import {
  SHEETS_CONFIG,
  getSafeSecretSummary,
  isValidAppsScriptExecUrl,
} from '../config/sheets';
import { PracticeProgress, SectionPolicySettings } from '../types/chemistry';
import { AttemptSubmissionPayload, StudentUser } from '../engine/sheetsSync';

export interface AppsScriptBaseResponse {
  ok: boolean;
  error?: string;
  receivedLength?: number;
  expectedLength?: number;
}

export interface LoginApiResponse extends AppsScriptBaseResponse {
  locked?: boolean;
  remainingMinutes?: number;
  remainingTries?: number;
  sessionToken?: string;
  tokenExpiresAt?: string;
  user?: StudentUser;
  progressMap?: Record<string, PracticeProgress>;
  unlockOverrides?: string[];
  settings?: SectionPolicySettings;
  serverNowIso?: string;
  serverDateKey?: string;
}

export interface ChangePinApiResponse extends AppsScriptBaseResponse {
  sessionExpired?: boolean;
  sessionToken?: string;
  tokenExpiresAt?: string;
  mustChangePin?: boolean;
  serverNowIso?: string;
  serverDateKey?: string;
}

export interface SaveAttemptApiResponse extends AppsScriptBaseResponse {
  sessionExpired?: boolean;
  duplicate?: boolean;
  attemptId?: string;
  officialPassDate?: string;
  serverNowIso?: string;
  serverDateKey?: string;
  progressMap?: Record<string, PracticeProgress>;
  unlockOverrides?: string[];
  settings?: SectionPolicySettings;
}

export interface SyncApiResponse extends AppsScriptBaseResponse {
  sessionExpired?: boolean;
  user?: StudentUser;
  progressMap?: Record<string, PracticeProgress>;
  unlockOverrides?: string[];
  settings?: SectionPolicySettings;
  serverNowIso?: string;
  serverDateKey?: string;
}

export interface PingApiResponse extends AppsScriptBaseResponse {
  secretMatches?: boolean;
}

export type ConnectionCheckStatus =
  | 'Secret matches'
  | 'Secret does not match'
  | 'No secret received'
  | 'Cannot reach script';

export interface ConnectionCheckResult {
  status: ConnectionCheckStatus;
  sentLength: number;
  firstChar: string;
  lastChar: string;
  expectedLength: number | null;
  receivedLength: number | null;
  detail: string;
}

export function formatSecretCharsLabel(summary: {
  length: number;
  firstChar: string;
  lastChar: string;
}): string {
  if (summary.length === 0) return 'None';
  if (summary.length === 1) return `${summary.firstChar} (1 char)`;
  return `${summary.firstChar} ... ${summary.lastChar}`;
}

export function formatUnauthorizedSecretMessage(
  sentSummary: { length: number; firstChar: string; lastChar: string },
  receivedLength?: number,
  expectedLength?: number
): string {
  const charsLabel = formatSecretCharsLabel(sentSummary);
  const expectedPart =
    typeof expectedLength === 'number' ? `, script expects ${expectedLength} chars` : '';

  if (sentSummary.length === 0 || receivedLength === 0) {
    return `No secret received: app sent ${sentSummary.length} chars (${charsLabel})${expectedPart}. Check VITE_APPS_SCRIPT_SECRET and Code.gs line 14.`;
  }

  const receivedPart =
    typeof receivedLength === 'number' ? `, script received ${receivedLength} chars` : '';
  return `Secret does not match: app sent ${sentSummary.length} chars (${charsLabel})${receivedPart}${expectedPart}.`;
}

export function classifyPingResponse(
  sentSummary: { length: number; firstChar: string; lastChar: string },
  data: PingApiResponse | null
): ConnectionCheckResult {
  if (!data || typeof data.ok !== 'boolean') {
    return {
      status: 'Cannot reach script',
      sentLength: sentSummary.length,
      firstChar: sentSummary.firstChar,
      lastChar: sentSummary.lastChar,
      expectedLength: null,
      receivedLength: null,
      detail: 'Apps Script did not return valid JSON. Confirm deployment access is set to "Anyone" and the URL ends with /exec.',
    };
  }

  const receivedLength =
    typeof data.receivedLength === 'number' ? data.receivedLength : sentSummary.length;
  const expectedLength = typeof data.expectedLength === 'number' ? data.expectedLength : null;

  if (data.ok && data.secretMatches) {
    return {
      status: 'Secret matches',
      sentLength: sentSummary.length,
      firstChar: sentSummary.firstChar,
      lastChar: sentSummary.lastChar,
      expectedLength,
      receivedLength,
      detail: 'The app secret matches APP_SECRET in your deployed Google Apps Script.',
    };
  }

  if (receivedLength === 0 || sentSummary.length === 0) {
    return {
      status: 'No secret received',
      sentLength: sentSummary.length,
      firstChar: sentSummary.firstChar,
      lastChar: sentSummary.lastChar,
      expectedLength,
      receivedLength,
      detail:
        sentSummary.length === 0
          ? 'VITE_APPS_SCRIPT_SECRET is empty in the running preview. Set it, apply environment variables, and reload.'
          : 'The script received an empty secret.',
    };
  }

  return {
    status: 'Secret does not match',
    sentLength: sentSummary.length,
    firstChar: sentSummary.firstChar,
    lastChar: sentSummary.lastChar,
    expectedLength,
    receivedLength,
    detail:
      'Set VITE_APPS_SCRIPT_SECRET and Code.gs line 14 APP_SECRET to the exact same value, apply env vars, and deploy a New version of the script.',
  };
}

/**
 * Calls the Google Apps Script Web App via POST using text/plain to avoid
 * CORS preflight OPTIONS requests (which Google Apps Script does not handle).
 */
async function sendRawAppsScriptPost<T extends AppsScriptBaseResponse>(
  payload: Record<string, unknown>
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('offline');
  }

  const response = await fetch(SHEETS_CONFIG.scriptUrl, {
    method: 'POST',
    // Simple text/plain Content-Type with no custom headers avoids CORS preflight
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      ...payload,
      appSecret: SHEETS_CONFIG.appSecret,
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Apps Script returned status ${response.status}`);
  }

  const text = await response.text();
  return JSON.parse(text) as T;
}

async function postToAppsScript<T extends AppsScriptBaseResponse>(
  payload: Record<string, unknown>
): Promise<T> {
  if (!isValidAppsScriptExecUrl(SHEETS_CONFIG.scriptUrl)) {
    return {
      ok: false,
      error:
        'Cannot reach script: VITE_APPS_SCRIPT_URL must be set to your deployed https://.../exec URL.',
    } as T;
  }

  const sentSummary = getSafeSecretSummary(SHEETS_CONFIG.appSecret);
  if (sentSummary.length === 0) {
    return {
      ok: false,
      error:
        'No secret received: VITE_APPS_SCRIPT_SECRET is empty in this app build. Set it, apply environment variables, and check Settings -> Connection check.',
    } as T;
  }

  const result = await sendRawAppsScriptPost<T>(payload);
  if (
    !result.ok &&
    (typeof result.receivedLength === 'number' ||
      /unauthorized app key/i.test(result.error || ''))
  ) {
    return {
      ...result,
      error: formatUnauthorizedSecretMessage(
        sentSummary,
        result.receivedLength,
        result.expectedLength
      ),
    };
  }

  return result;
}

export async function checkSheetsConnection(): Promise<ConnectionCheckResult> {
  const sentSummary = getSafeSecretSummary(SHEETS_CONFIG.appSecret);

  if (!isValidAppsScriptExecUrl(SHEETS_CONFIG.scriptUrl)) {
    return {
      status: 'Cannot reach script',
      sentLength: sentSummary.length,
      firstChar: sentSummary.firstChar,
      lastChar: sentSummary.lastChar,
      expectedLength: null,
      receivedLength: null,
      detail: 'VITE_APPS_SCRIPT_URL is missing or does not end with /exec.',
    };
  }

  try {
    const data = await sendRawAppsScriptPost<PingApiResponse>({
      action: 'ping',
    });
    return classifyPingResponse(sentSummary, data);
  } catch {
    return {
      status: 'Cannot reach script',
      sentLength: sentSummary.length,
      firstChar: sentSummary.firstChar,
      lastChar: sentSummary.lastChar,
      expectedLength: null,
      receivedLength: null,
      detail:
        'Could not reach the Apps Script /exec endpoint. Check your internet connection, the /exec URL, and that script access is set to "Anyone".',
    };
  }
}

export async function loginStudent(username: string, pin: string): Promise<LoginApiResponse> {
  return postToAppsScript<LoginApiResponse>({
    action: 'login',
    username: username.trim(),
    pin: pin.trim(),
  });
}

export async function changeStudentPin(
  sessionToken: string,
  currentPin: string,
  newPin: string
): Promise<ChangePinApiResponse> {
  return postToAppsScript<ChangePinApiResponse>({
    action: 'changePin',
    sessionToken,
    currentPin: currentPin.trim(),
    newPin: newPin.trim(),
  });
}

export async function saveStudentAttempt(
  sessionToken: string,
  attempt: AttemptSubmissionPayload
): Promise<SaveAttemptApiResponse> {
  return postToAppsScript<SaveAttemptApiResponse>({
    action: 'saveAttempt',
    sessionToken,
    attempt,
  });
}

export async function syncStudentSession(sessionToken: string): Promise<SyncApiResponse> {
  return postToAppsScript<SyncApiResponse>({
    action: 'sync',
    sessionToken,
  });
}

export async function logoutStudent(sessionToken: string): Promise<{ ok: boolean }> {
  try {
    return await postToAppsScript<{ ok: boolean; error?: string }>({
      action: 'logout',
      sessionToken,
    });
  } catch {
    return { ok: true };
  }
}
