import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDirectDeepLinkRoute,
  shouldAutoStartApp,
  shouldShowFrontPageOnLaunch,
} from './frontPage';

const RULES = [
  'writing-chemical-formulas',
  'metal-one-oxidation-nonmetal',
  'nonmetal-nonmetal',
];
const SETS = ['writing-chemical-formulas', 'nonmetal-nonmetal'];

test('shows front page by default on root launch when skipSaved is false', () => {
  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '', hash: '' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    true
  );

  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: {
        pathname: '/storage/emulated/0/Download/compound-naming-guide.html',
        search: '',
        hash: '',
      },
      basePath: './',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    true
  );
});

test('skips front page when skipSaved is true or autostart=1 is present', () => {
  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '', hash: '' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: true,
    }),
    false
  );

  assert.equal(
    shouldAutoStartApp({ pathname: '/', search: '?autostart=1', hash: '' }),
    true
  );
  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '?autostart=1', hash: '' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    false
  );
});

test('skips front page for direct links to a library, practice set, or tool route', () => {
  assert.equal(
    isDirectDeepLinkRoute(
      { pathname: '/', search: '', hash: '#/library/nonmetal-nonmetal' },
      '/',
      RULES,
      SETS
    ),
    true
  );
  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '', hash: '#/library/nonmetal-nonmetal' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    false
  );

  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '?tab=libraries&rule=nonmetal-nonmetal', hash: '' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    false
  );

  assert.equal(
    shouldShowFrontPageOnLaunch({
      loc: { pathname: '/', search: '', hash: '#/periodic-table' },
      basePath: '/',
      validRuleIds: RULES,
      validSetIds: SETS,
      skipSaved: false,
    }),
    false
  );
});
