const viteEnv: Record<string, unknown> =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env === 'object' &&
  import.meta.env !== null
    ? (import.meta.env as Record<string, unknown>)
    : {};

export function cleanEnvValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__
    ? __APP_VERSION__
    : '1.0.0';

export const APP_BUILD_DATE =
  typeof __APP_BUILD_DATE__ !== 'undefined' && __APP_BUILD_DATE__
    ? __APP_BUILD_DATE__
    : '2026-11-23';

export const IS_SINGLE_FILE_BUILD =
  typeof __APP_IS_SINGLE_FILE__ !== 'undefined' ? Boolean(__APP_IS_SINGLE_FILE__) : false;

export const SINGLE_FILE_SIZE_BYTES =
  typeof __SINGLE_FILE_SIZE_BYTES__ !== 'undefined' && Number.isFinite(__SINGLE_FILE_SIZE_BYTES__)
    ? Number(__SINGLE_FILE_SIZE_BYTES__)
    : 0;

export function formatBytesSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '~1.1 MB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getNormalizedViteBase(): string {
  const raw = typeof viteEnv.BASE_URL === 'string' && viteEnv.BASE_URL ? viteEnv.BASE_URL : '/';
  if (raw === './') return './';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export function getOfflineDownloadUrl(): string {
  const base = getNormalizedViteBase();
  return base === './' ? './compound-naming-guide.html' : `${base}compound-naming-guide.html`;
}

export function getEffectiveUpdateUrl(): string {
  if (isOfflineFileCopy()) return '';
  const base = getNormalizedViteBase();
  return base === './' ? './version.json' : `${base}version.json`;
}

export function isFileProtocol(loc?: { protocol?: string }): boolean {
  const target = loc ?? (typeof window !== 'undefined' ? window.location : undefined);
  return target?.protocol === 'file:';
}

export function isOfflineFileCopy(): boolean {
  return IS_SINGLE_FILE_BUILD || isFileProtocol();
}

export function compareVersions(a: string, b: string): number {
  const clean = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => {
        const parsed = parseInt(part, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      });

  const pa = clean(a);
  const pb = clean(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export interface UpdateCheckResult {
  status: 'up-to-date' | 'update-available' | 'offline' | 'unconfigured' | 'error';
  currentVersion: string;
  latestVersion?: string;
  downloadUrl?: string;
  message: string;
}

export async function checkForAppUpdate(
  updateUrl: string = getEffectiveUpdateUrl(),
  currentVersion: string = APP_VERSION
): Promise<UpdateCheckResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'offline',
      currentVersion,
      message: 'You are offline. Connect to the internet to check for updates.',
    };
  }

  const trimmedUrl = cleanEnvValue(updateUrl);
  if (!trimmedUrl) {
    return {
      status: 'unconfigured',
      currentVersion,
      message: 'This offline file runs independently without update endpoints.',
    };
  }

  try {
    const res = await fetch(trimmedUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
    });
    if (!res.ok) {
      return {
        status: 'error',
        currentVersion,
        message: `Update check failed (HTTP ${res.status}).`,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !trimmedUrl.toLowerCase().endsWith('.json')) {
      return {
        status: 'update-available',
        currentVersion,
        downloadUrl: trimmedUrl,
        message: 'Download link reached. Open it to get the latest file if newer.',
      };
    }

    const data = (await res.json()) as {
      version?: string;
      downloadUrl?: string;
      url?: string;
    };
    const latestVersion = cleanEnvValue(data.version);
    const downloadUrl = cleanEnvValue(data.downloadUrl || data.url) || trimmedUrl;

    if (!latestVersion) {
      return {
        status: 'error',
        currentVersion,
        message: 'Update check response did not include a version number.',
      };
    }

    if (compareVersions(latestVersion, currentVersion) > 0) {
      return {
        status: 'update-available',
        currentVersion,
        latestVersion,
        downloadUrl,
        message: `A newer version (v${latestVersion}) is available to download.`,
      };
    }

    return {
      status: 'up-to-date',
      currentVersion,
      latestVersion,
      message: `You already have the latest version (v${currentVersion}).`,
    };
  } catch (err) {
    return {
      status: 'error',
      currentVersion,
      message:
        err instanceof Error && err.message
          ? `Could not check for updates: ${err.message}`
          : 'Could not check for updates right now.',
    };
  }
}
