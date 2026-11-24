import { NavTab } from '../components/common/Navigation';

export const VALID_TABS: NavTab[] = [
  'libraries',
  'wizard',
  'crisscross',
  'oxidation-solver',
  'flashcards',
  'converter',
  'periodic-table',
  'practice',
  'teacher',
];

export function shouldUseHashRouting(
  isSingleFileBuild: boolean,
  loc?: { protocol?: string }
): boolean {
  const target = loc ?? (typeof window !== 'undefined' ? window.location : undefined);
  return Boolean(isSingleFileBuild || target?.protocol === 'file:');
}

export function buildAppRouteUrl(options: {
  useHash: boolean;
  basePath: string;
  tab: NavTab;
  libraryId?: string;
  practiceSetId?: string;
}): string {
  const { useHash, basePath, tab, libraryId, practiceSetId } = options;
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

  if (useHash) {
    if (tab === 'libraries') {
      return libraryId ? `#/library/${libraryId}` : '#/library';
    }
    if (tab === 'practice') {
      return practiceSetId ? `#/practice/${practiceSetId}` : '#/practice';
    }
    return `#/${tab}`;
  }

  const params = new URLSearchParams();
  params.set('tab', tab);
  if (tab === 'libraries' && libraryId) {
    params.set('rule', libraryId);
  }
  if (tab === 'practice' && practiceSetId) {
    params.set('set', practiceSetId);
  }
  return `${cleanBase}?${params.toString()}`;
}

export function parseAppRoute(
  loc: { pathname: string; search: string; hash: string },
  basePath: string,
  validRuleIds: string[],
  validSetIds: string[]
): {
  tab: NavTab;
  ruleId: string | null;
  setId: string | null;
} {
  try {
    let tab: NavTab = 'libraries';
    let ruleId: string | null = null;
    let setId: string | null = null;

    // 1. Prefer hash routes (#/library, #/library/<id>, #/periodic-table, #/practice/<id>, #/teacher, etc.)
    const rawHash = (loc.hash || '').replace(/^#/, '');
    if (rawHash.startsWith('/')) {
      const [hashPathPart, hashQueryPart = ''] = rawHash.split('?');
      const hashParams = new URLSearchParams(hashQueryPart);
      const hashRule = hashParams.get('rule');
      const hashSet = hashParams.get('set');
      const hashSegs = hashPathPart.split('/').filter(Boolean);
      const head = hashSegs[0] || '';
      const second = hashSegs[1] || '';

      if (hashRule && validRuleIds.includes(hashRule)) {
        return { tab: 'libraries', ruleId: hashRule, setId: null };
      }
      if (hashSet && validSetIds.includes(hashSet)) {
        return { tab: 'practice', ruleId: null, setId: hashSet };
      }

      if (head === 'library' || head === 'libraries' || head === 'rule') {
        tab = 'libraries';
        if (second && validRuleIds.includes(second)) {
          ruleId = second;
        }
        return { tab, ruleId, setId: null };
      }
      if (head === 'practice' || head === 'topics') {
        tab = 'practice';
        if (second && validSetIds.includes(second)) {
          setId = second;
        }
        return { tab, ruleId: null, setId };
      }
      if (head === 'nomen') {
        return { tab: 'wizard', ruleId: null, setId: null };
      }
      if (VALID_TABS.includes(head as NavTab)) {
        return { tab: head as NavTab, ruleId: null, setId: null };
      }
      return { tab: 'libraries', ruleId: null, setId: null };
    }

    // 2. Fallback to query/path routes for standard hosted PWA links
    const params = new URLSearchParams(loc.search);
    const tabParam = params.get('tab');
    const ruleParam = params.get('rule');
    const setParam = params.get('set');

    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const escapedBase = cleanBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const segments = loc.pathname
      .replace(new RegExp(`^${escapedBase}`), '')
      .split('/')
      .filter(Boolean);

    if (ruleParam && validRuleIds.includes(ruleParam)) {
      tab = 'libraries';
      ruleId = ruleParam;
    } else if (setParam && validSetIds.includes(setParam)) {
      tab = 'practice';
      setId = setParam;
    } else if (tabParam) {
      if (tabParam === 'nomen') {
        tab = 'wizard';
      } else if (tabParam === 'topics') {
        tab = 'practice';
      } else if (VALID_TABS.includes(tabParam as NavTab)) {
        tab = tabParam as NavTab;
      }
    } else if (segments.length > 0) {
      const head = segments[0];
      const second = segments[1];
      if ((head === 'rule' || head === 'library' || head === 'libraries') && second && validRuleIds.includes(second)) {
        tab = 'libraries';
        ruleId = second;
      } else if ((head === 'practice' || head === 'topics') && second && validSetIds.includes(second)) {
        tab = 'practice';
        setId = second;
      } else if (head === 'library') {
        tab = 'libraries';
      } else if (VALID_TABS.includes(head as NavTab)) {
        tab = head as NavTab;
      }
    }

    return { tab, ruleId, setId };
  } catch {
    return { tab: 'libraries', ruleId: null, setId: null };
  }
}
