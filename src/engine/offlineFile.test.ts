import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppRouteUrl,
  parseAppRoute,
  shouldUseHashRouting,
} from '../utils/routing';
import {
  hasStorageFailure,
  probeStorageAvailability,
  resetStorageFallbackForTests,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  subscribeStorageFailure,
} from '../utils/safeStorage';
import {
  checkForAppUpdate,
  compareVersions,
  isFileProtocol,
} from '../config/appInfo';

const SAMPLE_RULES = [
  'writing-chemical-formulas',
  'metal-one-oxidation-nonmetal',
  'nonmetal-nonmetal',
];
const SAMPLE_SETS = [
  'writing-chemical-formulas',
  'metal-one-oxidation-nonmetal',
  'nonmetal-nonmetal',
];

describe('routing utility for single-file and hosted modes', () => {
  it('enables hash routing for single-file builds or file:// protocol', () => {
    assert.equal(shouldUseHashRouting(true, { protocol: 'https:' }), true);
    assert.equal(shouldUseHashRouting(false, { protocol: 'file:' }), true);
    assert.equal(shouldUseHashRouting(false, { protocol: 'https:' }), false);
  });

  it('builds hash URLs when useHash is true and query URLs when false', () => {
    assert.equal(
      buildAppRouteUrl({
        useHash: true,
        basePath: './',
        tab: 'libraries',
        libraryId: 'nonmetal-nonmetal',
      }),
      '#/library/nonmetal-nonmetal'
    );
    assert.equal(
      buildAppRouteUrl({
        useHash: true,
        basePath: './',
        tab: 'periodic-table',
      }),
      '#/periodic-table'
    );
    assert.equal(
      buildAppRouteUrl({
        useHash: true,
        basePath: './',
        tab: 'practice',
        practiceSetId: 'writing-chemical-formulas',
      }),
      '#/practice/writing-chemical-formulas'
    );
    assert.equal(
      buildAppRouteUrl({
        useHash: false,
        basePath: '/',
        tab: 'libraries',
        libraryId: 'writing-chemical-formulas',
      }),
      '/?tab=libraries&rule=writing-chemical-formulas'
    );
  });

  it('parses hash routes accurately without breaking on file:// pathnames', () => {
    assert.deepEqual(
      parseAppRoute(
        {
          pathname: '/storage/emulated/0/Download/compound-naming-guide.html',
          search: '',
          hash: '#/periodic-table',
        },
        './',
        SAMPLE_RULES,
        SAMPLE_SETS
      ),
      { tab: 'periodic-table', ruleId: null, setId: null }
    );

    assert.deepEqual(
      parseAppRoute(
        {
          pathname: '/Users/student/Desktop/compound-naming-guide.html',
          search: '',
          hash: '#/library/nonmetal-nonmetal',
        },
        './',
        SAMPLE_RULES,
        SAMPLE_SETS
      ),
      { tab: 'libraries', ruleId: 'nonmetal-nonmetal', setId: null }
    );

    assert.deepEqual(
      parseAppRoute(
        {
          pathname: '/C:/Downloads/compound-naming-guide.html',
          search: '',
          hash: '#/practice/nonmetal-nonmetal',
        },
        './',
        SAMPLE_RULES,
        SAMPLE_SETS
      ),
      { tab: 'practice', ruleId: null, setId: 'nonmetal-nonmetal' }
    );

    assert.deepEqual(
      parseAppRoute(
        {
          pathname: '/C:/Downloads/compound-naming-guide.html',
          search: '',
          hash: '#/nomen',
        },
        './',
        SAMPLE_RULES,
        SAMPLE_SETS
      ),
      { tab: 'wizard', ruleId: null, setId: null }
    );
  });

  it('parses hosted query/path URLs accurately when hash is empty', () => {
    assert.deepEqual(
      parseAppRoute(
        {
          pathname: '/Nomenclature/',
          search: '?tab=crisscross',
          hash: '',
        },
        '/Nomenclature/',
        SAMPLE_RULES,
        SAMPLE_SETS
      ),
      { tab: 'crisscross', ruleId: null, setId: null }
    );
  });
});

describe('safeStorage with in-memory fallback', () => {
  it('stores and retrieves values cleanly when storage succeeds', () => {
    resetStorageFallbackForTests();
    const backing = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => {
        backing.set(k, v);
      },
      removeItem: (k: string) => {
        backing.delete(k);
      },
    };

    assert.equal(probeStorageAvailability(mockStorage), true);
    assert.equal(hasStorageFailure(), false);
    assert.equal(safeSetItem('test_key', 'abc', mockStorage), true);
    assert.equal(safeGetItem('test_key', mockStorage), 'abc');
    safeRemoveItem('test_key', mockStorage);
    assert.equal(safeGetItem('test_key', mockStorage), null);
  });

  it('falls back to in-memory store and marks storage failure when storage throws', () => {
    resetStorageFallbackForTests();
    let notified = false;
    const unsubscribe = subscribeStorageFailure((failed) => {
      if (failed) notified = true;
    });

    const throwingStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };

    assert.equal(probeStorageAvailability(throwingStorage), false);
    assert.equal(hasStorageFailure(), true);
    assert.equal(notified, true);
    assert.equal(safeSetItem('pending_attempt', '{"score":90}', throwingStorage), false);
    assert.equal(safeGetItem('pending_attempt', throwingStorage), '{"score":90}');
    safeRemoveItem('pending_attempt', throwingStorage);
    assert.equal(safeGetItem('pending_attempt', throwingStorage), null);
    unsubscribe();
  });

  it('handles null storage cleanly without throwing', () => {
    resetStorageFallbackForTests();
    assert.equal(probeStorageAvailability(null), false);
    assert.equal(safeSetItem('prefs', 'dark', null), false);
    assert.equal(safeGetItem('prefs', null), 'dark');
  });
});

describe('appInfo version comparison and update checker', () => {
  it('compares semantic version strings correctly', () => {
    assert.equal(compareVersions('1.1.0', '1.0.0'), 1);
    assert.equal(compareVersions('v1.0.2', '1.0.2'), 0);
    assert.equal(compareVersions('1.0.0', '2.0.0'), -1);
    assert.equal(compareVersions('1.2', '1.1.9'), 1);
  });

  it('detects file:// protocol helper accurately', () => {
    assert.equal(isFileProtocol({ protocol: 'file:' }), true);
    assert.equal(isFileProtocol({ protocol: 'https:' }), false);
  });

  it('returns unconfigured when APP_UPDATE_URL is blank and online', async () => {
    const res = await checkForAppUpdate('', '1.0.0');
    assert.equal(res.status, 'unconfigured');
  });

  it('returns offline when navigator.onLine is false', async () => {
    const originalNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    try {
      const res = await checkForAppUpdate('https://example.org/version.json', '1.0.0');
      assert.equal(res.status, 'offline');
    } finally {
      if (originalNav) {
        Object.defineProperty(globalThis, 'navigator', originalNav);
      }
    }
  });

  it('reports update-available or up-to-date from remote JSON manifest', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            version: '1.2.0',
            downloadUrl: 'https://example.org/compound-naming-guide.html',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )) as typeof fetch;

      const updateAvail = await checkForAppUpdate('https://example.org/version.json', '1.0.0');
      assert.equal(updateAvail.status, 'update-available');
      assert.equal(updateAvail.latestVersion, '1.2.0');
      assert.equal(updateAvail.downloadUrl, 'https://example.org/compound-naming-guide.html');

      const upToDate = await checkForAppUpdate('https://example.org/version.json', '1.2.0');
      assert.equal(upToDate.status, 'up-to-date');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
