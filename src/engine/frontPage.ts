import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export const SKIP_FRONT_PAGE_KEY = 'ilab_skip_front_page_v1';

export interface FrontPageLocationLike {
  pathname: string;
  search: string;
  hash: string;
}

export function loadSkipFrontPage(): boolean {
  try {
    return safeGetItem(SKIP_FRONT_PAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSkipFrontPage(skip: boolean): boolean {
  try {
    return safeSetItem(SKIP_FRONT_PAGE_KEY, skip ? 'true' : 'false');
  } catch {
    return false;
  }
}

/**
 * Checks whether the current URL directly targets a specific library, practice set,
 * or tool screen so deep links open directly without stopping on the front page.
 */
export function isDirectDeepLinkRoute(
  loc: FrontPageLocationLike,
  basePath: string,
  validRuleIds: string[],
  validSetIds: string[]
): boolean {
  try {
    const rawHash = (loc.hash || '').replace(/^#/, '');
    if (rawHash.startsWith('/')) {
      const [hashPathPart, hashQueryPart = ''] = rawHash.split('?');
      const hashParams = new URLSearchParams(hashQueryPart);
      const hashRule = hashParams.get('rule');
      const hashSet = hashParams.get('set');
      if (hashRule && validRuleIds.includes(hashRule)) return true;
      if (hashSet && validSetIds.includes(hashSet)) return true;

      const hashSegs = hashPathPart.split('/').filter(Boolean);
      const head = hashSegs[0] || '';
      const second = hashSegs[1] || '';

      if (
        (head === 'library' || head === 'libraries' || head === 'rule') &&
        second &&
        validRuleIds.includes(second)
      ) {
        return true;
      }
      if (head === 'practice') {
        return true;
      }
      if (
        head &&
        head !== 'library' &&
        head !== 'libraries' &&
        head !== 'rule'
      ) {
        return true;
      }
    }

    const params = new URLSearchParams(loc.search || '');
    const ruleParam = params.get('rule');
    const setParam = params.get('set');
    const tabParam = params.get('tab');
    if (ruleParam && validRuleIds.includes(ruleParam)) return true;
    if (setParam && validSetIds.includes(setParam)) return true;
    if (tabParam && tabParam !== 'libraries') return true;

    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const escapedBase = cleanBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const segments = (loc.pathname || '')
      .replace(new RegExp(`^${escapedBase}`), '')
      .split('/')
      .filter(Boolean);

    if (segments.length > 0) {
      const head = segments[0];
      const second = segments[1] || '';
      // Ignore file names like compound-naming-guide.html or index.html when opened from disk
      const isHtmlFileSegment = segments.some((seg) => /\.html?$/i.test(seg));
      if (!isHtmlFileSegment) {
        if (
          (head === 'rule' || head === 'library' || head === 'libraries') &&
          second &&
          validRuleIds.includes(second)
        ) {
          return true;
        }
        if (head && head !== 'library' && head !== 'libraries' && head !== 'rule') {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function shouldAutoStartApp(loc: FrontPageLocationLike): boolean {
  try {
    const searchParams = new URLSearchParams(loc.search || '');
    const rawAuto = searchParams.get('autostart');
    if (rawAuto === '1' || rawAuto === 'true') return true;

    const rawHash = (loc.hash || '').replace(/^#/, '');
    const qIdx = rawHash.indexOf('?');
    if (qIdx >= 0) {
      const hashParams = new URLSearchParams(rawHash.slice(qIdx + 1));
      const hashAuto = hashParams.get('autostart');
      if (hashAuto === '1' || hashAuto === 'true') return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function shouldShowFrontPageOnLaunch(options: {
  loc: FrontPageLocationLike;
  basePath: string;
  validRuleIds: string[];
  validSetIds: string[];
  skipSaved: boolean;
}): boolean {
  const { loc, basePath, validRuleIds, validSetIds, skipSaved } = options;
  if (skipSaved) return false;
  if (shouldAutoStartApp(loc)) return false;
  if (isDirectDeepLinkRoute(loc, basePath, validRuleIds, validSetIds)) return false;
  return true;
}
