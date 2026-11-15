import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveCompound,
  buildCompoundName,
  checkAnswerForgiving,
  buildIonicFormula,
} from './namingEngine';
import { CATIONS, ANIONS } from '../data/ions';

test('Required Case: ZnS zinc sulfide', () => {
  const zn = CATIONS.find((c) => c.symbol === 'Zn' && c.charge === 2)!;
  const s = ANIONS.find((a) => a.symbol === 'S' && a.charge === -2)!;
  const res = buildCompoundName(zn, s);
  assert.equal(res.formula, 'ZnS');
  assert.equal(res.iupacName, 'zinc sulfide');

  const solved = solveCompound('ZnS');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'zinc sulfide');
});

test('Required Case: Li2O lithium oxide', () => {
  const li = CATIONS.find((c) => c.symbol === 'Li' && c.charge === 1)!;
  const o = ANIONS.find((a) => a.symbol === 'O' && a.charge === -2)!;
  const res = buildCompoundName(li, o);
  assert.equal(res.formula, 'Li2O');
  assert.equal(res.iupacName, 'lithium oxide');

  const solved = solveCompound('Li2O');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'lithium oxide');
});

test('Required Case: FeS iron (II) sulfide / ferrous sulfide', () => {
  const fe2 = CATIONS.find((c) => c.symbol === 'Fe' && c.charge === 2)!;
  const s = ANIONS.find((a) => a.symbol === 'S' && a.charge === -2)!;
  const res = buildCompoundName(fe2, s);
  assert.equal(res.formula, 'FeS');
  assert.equal(res.iupacName, 'iron (II) sulfide');
  assert.equal(res.traditionalName, 'ferrous sulfide');

  const solved = solveCompound('FeS');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'iron (II) sulfide');
  assert.equal(solved.traditionalName, 'ferrous sulfide');
});

test('Required Case: Fe2S3 iron (III) sulfide / ferric sulfide', () => {
  const fe3 = CATIONS.find((c) => c.symbol === 'Fe' && c.charge === 3)!;
  const s = ANIONS.find((a) => a.symbol === 'S' && a.charge === -2)!;
  const res = buildCompoundName(fe3, s);
  assert.equal(res.formula, 'Fe2S3');
  assert.equal(res.iupacName, 'iron (III) sulfide');
  assert.equal(res.traditionalName, 'ferric sulfide');

  const solved = solveCompound('Fe2S3');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'iron (III) sulfide');
  assert.equal(solved.traditionalName, 'ferric sulfide');
});

test('Required Case: Hg2O mercury (I) oxide / mercurous oxide', () => {
  const hg1 = CATIONS.find((c) => c.symbol === 'Hg' && c.charge === 1)!;
  const o = ANIONS.find((a) => a.symbol === 'O' && a.charge === -2)!;
  const res = buildCompoundName(hg1, o);
  assert.equal(res.formula, 'Hg2O');
  assert.equal(res.iupacName, 'mercury (I) oxide');
  assert.equal(res.traditionalName, 'mercurous oxide');

  const solved = solveCompound('Hg2O');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'mercury (I) oxide');
  assert.equal(solved.traditionalName, 'mercurous oxide');
});

test('Required Case: HgO mercury (II) oxide / mercuric oxide', () => {
  const hg2 = CATIONS.find((c) => c.symbol === 'Hg' && c.charge === 2)!;
  const o = ANIONS.find((a) => a.symbol === 'O' && a.charge === -2)!;
  const res = buildCompoundName(hg2, o);
  assert.equal(res.formula, 'HgO');
  assert.equal(res.iupacName, 'mercury (II) oxide');
  assert.equal(res.traditionalName, 'mercuric oxide');

  const solved = solveCompound('HgO');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'mercury (II) oxide');
  assert.equal(solved.traditionalName, 'mercuric oxide');
});

test('Required Case: CO carbon monoxide', () => {
  const solved = solveCompound('CO');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'carbon monoxide');
});

test('Required Case: CO2 carbon dioxide', () => {
  const solved = solveCompound('CO2');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'carbon dioxide');
});

test('Required Case: N2O5 dinitrogen pentoxide', () => {
  const solved = solveCompound('N2O5');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'dinitrogen pentoxide');
});

test('Required Case: HF hydrofluoric acid', () => {
  const solved = solveCompound('HF');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'hydrofluoric acid');
});

test('Required Case: HI hydroiodic acid', () => {
  const solved = solveCompound('HI');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'hydroiodic acid');
});

test('Required Case: NaNO3 sodium nitrate', () => {
  const na = CATIONS.find((c) => c.symbol === 'Na' && c.charge === 1)!;
  const no3 = ANIONS.find((a) => a.symbol === 'NO3' && a.charge === -1)!;
  const res = buildCompoundName(na, no3);
  assert.equal(res.formula, 'NaNO3');
  assert.equal(res.iupacName, 'sodium nitrate');

  const solved = solveCompound('NaNO3');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'sodium nitrate');
});

test('Required Case: Ca3(PO4)2 calcium phosphate', () => {
  const ca = CATIONS.find((c) => c.symbol === 'Ca' && c.charge === 2)!;
  const po4 = ANIONS.find((a) => a.symbol === 'PO4' && a.charge === -3)!;
  const res = buildCompoundName(ca, po4);
  assert.equal(res.formula, 'Ca3(PO4)2');
  assert.equal(res.iupacName, 'calcium phosphate');

  const solved = solveCompound('Ca3(PO4)2');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'calcium phosphate');
});

test('Required Case: Pb(NO3)2 lead (II) nitrate / plumbous nitrate', () => {
  const pb2 = CATIONS.find((c) => c.symbol === 'Pb' && c.charge === 2)!;
  const no3 = ANIONS.find((a) => a.symbol === 'NO3' && a.charge === -1)!;
  const res = buildCompoundName(pb2, no3);
  assert.equal(res.formula, 'Pb(NO3)2');
  assert.equal(res.iupacName, 'lead (II) nitrate');
  assert.equal(res.traditionalName, 'plumbous nitrate');

  const solved = solveCompound('Pb(NO3)2');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'lead (II) nitrate');
  assert.equal(solved.traditionalName, 'plumbous nitrate');
});

test('Required Case: Pb(NO3)4 lead (IV) nitrate / plumbic nitrate', () => {
  const pb4 = CATIONS.find((c) => c.symbol === 'Pb' && c.charge === 4)!;
  const no3 = ANIONS.find((a) => a.symbol === 'NO3' && a.charge === -1)!;
  const res = buildCompoundName(pb4, no3);
  assert.equal(res.formula, 'Pb(NO3)4');
  assert.equal(res.iupacName, 'lead (IV) nitrate');
  assert.equal(res.traditionalName, 'plumbic nitrate');

  const solved = solveCompound('Pb(NO3)4');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'lead (IV) nitrate');
  assert.equal(solved.traditionalName, 'plumbic nitrate');
});

test('Required Case: HNO2 nitrous acid', () => {
  const solved = solveCompound('HNO2');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'nitrous acid');
});

test('Required Case: HNO3 nitric acid', () => {
  const solved = solveCompound('HNO3');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'nitric acid');
});

test('Required Case: H2SO3 sulfurous acid', () => {
  const solved = solveCompound('H2SO3');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'sulfurous acid');
});

test('Required Case: H2SO4 sulfuric acid', () => {
  const solved = solveCompound('H2SO4');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'sulfuric acid');
});

test('Required Case: H2O water', () => {
  const solved = solveCompound('H2O');
  assert.ok(solved);
  assert.equal(solved.iupacName, 'water');
});

test('Forgiving Answer Checking', () => {
  assert.ok(checkAnswerForgiving('iron(II) sulfide', ['iron (II) sulfide']));
  assert.ok(checkAnswerForgiving('iron (II) sulfide', ['iron(II) sulfide']));
  assert.ok(checkAnswerForgiving('h2so4', ['H2SO4']));
  assert.ok(checkAnswerForgiving('H₂SO₄', ['H2SO4']));
  assert.ok(checkAnswerForgiving('  ferrous  sulfide  ', ['ferrous sulfide']));
});
