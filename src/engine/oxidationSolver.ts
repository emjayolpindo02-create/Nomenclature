export interface OxidationStep {
  equation: string;
  explanation: string;
}

export interface OxidationSolution {
  formula: string;
  charge: number; // 0 for neutral
  targetElement: string;
  targetOxidation: number | string;
  isException?: boolean;
  exceptionType?: 'peroxide' | 'superoxide' | 'hydride' | 'elemental';
  steps: OxidationStep[];
  allOxidations: Record<string, number | string>;
}

export interface PresetProblem {
  id: string;
  formula: string;
  charge: number;
  name: string;
  targetElement: string;
  tag: 'exception' | 'standard' | 'polyatomic' | 'neutral';
  note: string;
}

export const PRESET_OXIDATION_PROBLEMS: PresetProblem[] = [
  {
    id: 'h2o2',
    formula: 'H2O2',
    charge: 0,
    name: 'Hydrogen Peroxide',
    targetElement: 'O',
    tag: 'exception',
    note: 'Oxygen peroxide exception (-1)',
  },
  {
    id: 'ko2',
    formula: 'KO2',
    charge: 0,
    name: 'Potassium Superoxide',
    targetElement: 'O',
    tag: 'exception',
    note: 'Oxygen superoxide exception (-1/2)',
  },
  {
    id: 'cah2',
    formula: 'CaH2',
    charge: 0,
    name: 'Calcium Hydride',
    targetElement: 'H',
    tag: 'exception',
    note: 'Hydrogen bonded to metal is -1',
  },
  {
    id: 'nah',
    formula: 'NaH',
    charge: 0,
    name: 'Sodium Hydride',
    targetElement: 'H',
    tag: 'exception',
    note: 'Hydrogen bonded to metal is -1',
  },
  {
    id: 'kmno4',
    formula: 'KMnO4',
    charge: 0,
    name: 'Potassium Permanganate',
    targetElement: 'Mn',
    tag: 'neutral',
    note: 'Manganese in high oxidation state (+7)',
  },
  {
    id: 'k2cr2o7',
    formula: 'K2Cr2O7',
    charge: 0,
    name: 'Potassium Dichromate',
    targetElement: 'Cr',
    tag: 'neutral',
    note: 'Chromium (+6) in dichromate',
  },
  {
    id: 'h2so4',
    formula: 'H2SO4',
    charge: 0,
    name: 'Sulfuric Acid',
    targetElement: 'S',
    tag: 'neutral',
    note: 'Sulfur in sulfuric acid (+6)',
  },
  {
    id: 'nh4_plus',
    formula: 'NH4+',
    charge: 1,
    name: 'Ammonium Ion',
    targetElement: 'N',
    tag: 'polyatomic',
    note: 'Nitrogen in ammonium ion (-3)',
  },
  {
    id: 'oh_minus',
    formula: 'OH-',
    charge: -1,
    name: 'Hydroxide Ion',
    targetElement: 'O',
    tag: 'polyatomic',
    note: 'Oxygen in hydroxide ion (-2)',
  },
  {
    id: 'co3_2minus',
    formula: 'CO3 2-',
    charge: -2,
    name: 'Carbonate Ion',
    targetElement: 'C',
    tag: 'polyatomic',
    note: 'Carbon in carbonate ion (+4)',
  },
  {
    id: 'fe2o3',
    formula: 'Fe2O3',
    charge: 0,
    name: 'Iron (III) Oxide',
    targetElement: 'Fe',
    tag: 'neutral',
    note: 'Iron in ferric oxide (+3)',
  },
  {
    id: 'o2',
    formula: 'O2',
    charge: 0,
    name: 'Oxygen Gas (Elemental)',
    targetElement: 'O',
    tag: 'exception',
    note: 'Pure elemental state is always 0',
  },
];

export function solveOxidationSteps(problem: PresetProblem): OxidationSolution {
  const steps: OxidationStep[] = [];
  const allOx: Record<string, number | string> = {};

  switch (problem.id) {
    case 'h2o2': {
      allOx['H'] = +1;
      allOx['O'] = -1;
      steps.push({
        equation: 'Total charge = 0 (neutral molecule)',
        explanation: 'The sum of all oxidation numbers in a neutral compound must equal 0.',
      });
      steps.push({
        equation: '2(ox # H) + 2(ox # O) = 0',
        explanation: 'There are 2 hydrogen atoms and 2 oxygen atoms.',
      });
      steps.push({
        equation: '2(+1) + 2(ox # O) = 0',
        explanation: 'Rule: Hydrogen bonded to nonmetals is assigned an oxidation state of +1.',
      });
      steps.push({
        equation: '+2 + 2(ox # O) = 0  =>  2(ox # O) = -2',
        explanation: 'Subtract 2 from both sides of the equation.',
      });
      steps.push({
        equation: 'ox # O = -1',
        explanation: 'Divide both sides by 2. In peroxides (containing the O-O single bond), oxygen has an oxidation number of -1!',
      });
      return {
        formula: 'H2O2',
        charge: 0,
        targetElement: 'O',
        targetOxidation: -1,
        isException: true,
        exceptionType: 'peroxide',
        steps,
        allOxidations: allOx,
      };
    }

    case 'ko2': {
      allOx['K'] = +1;
      allOx['O'] = '-1/2';
      steps.push({
        equation: 'Total charge = 0 (neutral compound)',
        explanation: 'Sum of oxidation numbers in neutral KO2 equals 0.',
      });
      steps.push({
        equation: '1(ox # K) + 2(ox # O) = 0',
        explanation: 'Potassium is Group 1A alkali metal, so its oxidation number is strictly +1.',
      });
      steps.push({
        equation: '1(+1) + 2(ox # O) = 0',
        explanation: 'Substitute +1 for potassium.',
      });
      steps.push({
        equation: '2(ox # O) = -1',
        explanation: 'Subtract 1 from both sides.',
      });
      steps.push({
        equation: 'ox # O = -1/2',
        explanation: 'Divide by 2. In superoxides (the O2⁻ ion), each oxygen has an oxidation number of -1/2!',
      });
      return {
        formula: 'KO2',
        charge: 0,
        targetElement: 'O',
        targetOxidation: '-1/2',
        isException: true,
        exceptionType: 'superoxide',
        steps,
        allOxidations: allOx,
      };
    }

    case 'cah2': {
      allOx['Ca'] = +2;
      allOx['H'] = -1;
      steps.push({
        equation: 'Total charge = 0 (neutral compound)',
        explanation: 'Sum of oxidation numbers in CaH2 is 0.',
      });
      steps.push({
        equation: '1(ox # Ca) + 2(ox # H) = 0',
        explanation: 'Calcium is in Group 2A (alkaline earth metal), so its oxidation number is +2.',
      });
      steps.push({
        equation: '1(+2) + 2(ox # H) = 0',
        explanation: 'Substitute +2 for Ca.',
      });
      steps.push({
        equation: '2(ox # H) = -2',
        explanation: 'Subtract 2 from both sides.',
      });
      steps.push({
        equation: 'ox # H = -1',
        explanation: 'Divide by 2. In metal hydrides, hydrogen gains an electron from the metal and is -1!',
      });
      return {
        formula: 'CaH2',
        charge: 0,
        targetElement: 'H',
        targetOxidation: -1,
        isException: true,
        exceptionType: 'hydride',
        steps,
        allOxidations: allOx,
      };
    }

    case 'nah': {
      allOx['Na'] = +1;
      allOx['H'] = -1;
      steps.push({
        equation: '1(ox # Na) + 1(ox # H) = 0',
        explanation: 'Sodium is Group 1A alkali metal: oxidation state is strictly +1.',
      });
      steps.push({
        equation: '+1 + (ox # H) = 0  =>  ox # H = -1',
        explanation: 'Hydrogen combined with an electropositive metal acts as a hydride with oxidation number -1.',
      });
      return {
        formula: 'NaH',
        charge: 0,
        targetElement: 'H',
        targetOxidation: -1,
        isException: true,
        exceptionType: 'hydride',
        steps,
        allOxidations: allOx,
      };
    }

    case 'kmno4': {
      allOx['K'] = +1;
      allOx['O'] = -2;
      allOx['Mn'] = +7;
      steps.push({
        equation: '1(ox # K) + 1(ox # Mn) + 4(ox # O) = 0',
        explanation: 'Total charge of neutral KMnO4 is 0.',
      });
      steps.push({
        equation: '1(+1) + 1(ox # Mn) + 4(-2) = 0',
        explanation: 'K is Group 1A (+1). Oxygen in normal oxides is -2.',
      });
      steps.push({
        equation: '+1 + (ox # Mn) + (-8) = 0',
        explanation: 'Multiply values: 4 × (-2) = -8.',
      });
      steps.push({
        equation: '(ox # Mn) - 7 = 0  =>  ox # Mn = +7',
        explanation: 'Manganese carries a +7 oxidation state in the permanganate compound.',
      });
      return {
        formula: 'KMnO4',
        charge: 0,
        targetElement: 'Mn',
        targetOxidation: 7,
        steps,
        allOxidations: allOx,
      };
    }

    case 'k2cr2o7': {
      allOx['K'] = +1;
      allOx['O'] = -2;
      allOx['Cr'] = +6;
      steps.push({
        equation: '2(ox # K) + 2(ox # Cr) + 7(ox # O) = 0',
        explanation: 'Neutral compound sum of oxidation numbers is 0.',
      });
      steps.push({
        equation: '2(+1) + 2(ox # Cr) + 7(-2) = 0',
        explanation: 'K is +1; Oxygen is -2.',
      });
      steps.push({
        equation: '+2 + 2(ox # Cr) - 14 = 0',
        explanation: 'Combine known terms: +2 - 14 = -12.',
      });
      steps.push({
        equation: '2(ox # Cr) - 12 = 0  =>  2(ox # Cr) = +12',
        explanation: 'Isolate 2(ox # Cr) = +12.',
      });
      steps.push({
        equation: 'ox # Cr = +6',
        explanation: 'Divide by 2. Each chromium atom has an oxidation number of +6.',
      });
      return {
        formula: 'K2Cr2O7',
        charge: 0,
        targetElement: 'Cr',
        targetOxidation: 6,
        steps,
        allOxidations: allOx,
      };
    }

    case 'h2so4': {
      allOx['H'] = +1;
      allOx['O'] = -2;
      allOx['S'] = +6;
      steps.push({
        equation: '2(ox # H) + 1(ox # S) + 4(ox # O) = 0',
        explanation: 'Neutral sulfuric acid sums to 0.',
      });
      steps.push({
        equation: '2(+1) + 1(ox # S) + 4(-2) = 0',
        explanation: 'Hydrogen with nonmetal is +1; Oxygen is -2.',
      });
      steps.push({
        equation: '+2 + (ox # S) - 8 = 0',
        explanation: 'Combine terms: +2 - 8 = -6.',
      });
      steps.push({
        equation: '(ox # S) - 6 = 0  =>  ox # S = +6',
        explanation: 'Sulfur has an oxidation state of +6 in sulfuric acid.',
      });
      return {
        formula: 'H2SO4',
        charge: 0,
        targetElement: 'S',
        targetOxidation: 6,
        steps,
        allOxidations: allOx,
      };
    }

    case 'nh4_plus': {
      allOx['H'] = +1;
      allOx['N'] = -3;
      steps.push({
        equation: '1(ox # N) + 4(ox # H) = +1',
        explanation: 'For a polyatomic ion, the sum equals the ion charge (+1).',
      });
      steps.push({
        equation: '1(ox # N) + 4(+1) = +1',
        explanation: 'Hydrogen with nonmetals is +1.',
      });
      steps.push({
        equation: '(ox # N) + 4 = +1  =>  ox # N = +1 - 4',
        explanation: 'Subtract 4 from both sides.',
      });
      steps.push({
        equation: 'ox # N = -3',
        explanation: 'Nitrogen has an oxidation number of -3 in ammonium.',
      });
      return {
        formula: 'NH4+',
        charge: 1,
        targetElement: 'N',
        targetOxidation: -3,
        steps,
        allOxidations: allOx,
      };
    }

    case 'oh_minus': {
      allOx['H'] = +1;
      allOx['O'] = -2;
      steps.push({
        equation: '1(ox # O) + 1(ox # H) = -1',
        explanation: 'Hydroxide ion carries an overall charge of -1.',
      });
      steps.push({
        equation: '1(ox # O) + 1(+1) = -1',
        explanation: 'Hydrogen is +1.',
      });
      steps.push({
        equation: 'ox # O + 1 = -1  =>  ox # O = -1 - 1',
        explanation: 'Subtract 1 from both sides.',
      });
      steps.push({
        equation: 'ox # O = -2',
        explanation: 'Oxygen has an oxidation number of -2 in hydroxide.',
      });
      return {
        formula: 'OH-',
        charge: -1,
        targetElement: 'O',
        targetOxidation: -2,
        steps,
        allOxidations: allOx,
      };
    }

    case 'co3_2minus': {
      allOx['O'] = -2;
      allOx['C'] = +4;
      steps.push({
        equation: '1(ox # C) + 3(ox # O) = -2',
        explanation: 'Carbonate ion carries an overall charge of -2.',
      });
      steps.push({
        equation: '1(ox # C) + 3(-2) = -2',
        explanation: 'Oxygen is -2 in typical oxyanions.',
      });
      steps.push({
        equation: '(ox # C) - 6 = -2  =>  ox # C = -2 + 6',
        explanation: 'Add 6 to both sides.',
      });
      steps.push({
        equation: 'ox # C = +4',
        explanation: 'Carbon has an oxidation number of +4 in carbonate.',
      });
      return {
        formula: 'CO3 2-',
        charge: -2,
        targetElement: 'C',
        targetOxidation: 4,
        steps,
        allOxidations: allOx,
      };
    }

    case 'fe2o3': {
      allOx['O'] = -2;
      allOx['Fe'] = +3;
      steps.push({
        equation: '2(ox # Fe) + 3(ox # O) = 0',
        explanation: 'Neutral ferric oxide sums to 0.',
      });
      steps.push({
        equation: '2(ox # Fe) + 3(-2) = 0',
        explanation: 'Oxygen is -2.',
      });
      steps.push({
        equation: '2(ox # Fe) - 6 = 0  =>  2(ox # Fe) = +6',
        explanation: 'Add 6 to both sides.',
      });
      steps.push({
        equation: 'ox # Fe = +3',
        explanation: 'Divide by 2. Iron is in the +3 oxidation state (iron (III) or ferric).',
      });
      return {
        formula: 'Fe2O3',
        charge: 0,
        targetElement: 'Fe',
        targetOxidation: 3,
        steps,
        allOxidations: allOx,
      };
    }

    case 'o2':
    default: {
      allOx['O'] = 0;
      steps.push({
        equation: 'Free uncombined element: ox # = 0',
        explanation: 'Rule: The oxidation number of any atom in an elemental uncombined state is always 0, regardless of whether it is monatomic (Fe, Zn) or polyatomic (O2, N2, S8, P4).',
      });
      return {
        formula: 'O2',
        charge: 0,
        targetElement: 'O',
        targetOxidation: 0,
        isException: true,
        exceptionType: 'elemental',
        steps,
        allOxidations: allOx,
      };
    }
  }
}
