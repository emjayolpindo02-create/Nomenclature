import { Cation, Anion, ColorPart, NamingResult } from '../types/chemistry';
import { CATIONS, ANIONS, GREEK_PREFIXES, BINARY_COVALENT_EXAMPLES, BINARY_ACIDS, TERNARY_ACIDS } from '../data/ions';
import { VARIABLE_VALENCE_METALS } from '../data/elements';

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function toRomanNumeral(num: number): string {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
  };
  return map[num] || String(num);
}

export function fromRomanNumeral(roman: string): number {
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
  };
  return map[roman.toUpperCase()] || 0;
}

export function formatSubscripts(formula: string, useUnicode: boolean = false): string {
  if (!useUnicode) return formula;
  const subscriptMap: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
  };
  return formula.replace(/\d/g, (d) => subscriptMap[d] || d);
}

export function unformatSubscripts(formula: string): string {
  const normalMap: Record<string, string> = {
    '₀': '0',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    '₄': '4',
    '₅': '5',
    '₆': '6',
    '₇': '7',
    '₈': '8',
    '₉': '9',
  };
  return formula.replace(/[₀-₉]/g, (d) => normalMap[d] || d);
}

/**
 * Generate ionic formula from cation and anion using Criss-Cross method
 */
export function buildIonicFormula(
  cation: Cation,
  anion: Anion
): { formula: string; cationCount: number; anionCount: number; steps: string[] } {
  // Special exception: Mercury (I) dimer ion
  if (cation.symbol === 'Hg' && cation.charge === 1) {
    if (anion.symbol === 'O' && anion.charge === -2) {
      return {
        formula: 'Hg2O',
        cationCount: 2,
        anionCount: 1,
        steps: [
          'Mercury (I) represents a +1 oxidation state per mercury atom, existing as [Hg₂]²⁺.',
          'Combining with oxide (O²⁻) balances +2 with -2, giving Hg₂O.',
        ],
      };
    }
  }

  const cationCharge = Math.abs(cation.charge);
  const anionCharge = Math.abs(anion.charge);

  const divisor = gcd(cationCharge, anionCharge);
  const cationSub = anionCharge / divisor;
  const anionSub = cationCharge / divisor;

  const steps: string[] = [
    `Cation: ${cation.symbol}${cation.charge > 1 ? cation.charge : ''}+, Anion: ${anion.symbol}${Math.abs(anion.charge) > 1 ? Math.abs(anion.charge) : ''}-`,
    `Criss-cross charges: Cation charge ${cationCharge} becomes anion subscript; anion charge ${anionCharge} becomes cation subscript.`,
  ];

  if (divisor > 1) {
    steps.push(`Reduce subscripts by greatest common divisor (${divisor}): ${anionCharge}:${cationCharge} simplifies to ${cationSub}:${anionSub}.`);
  }

  // Format cation part
  let cationPart = cation.symbol;
  if (cation.isPolyatomic && cationSub > 1) {
    cationPart = `(${cation.symbol})${cationSub}`;
  } else if (cationSub > 1) {
    cationPart = `${cation.symbol}${cationSub}`;
  }

  // Format anion part
  let anionPart = anion.symbol;
  if (anion.isPolyatomic && anionSub > 1) {
    anionPart = `(${anion.symbol})${anionSub}`;
  } else if (anionSub > 1) {
    anionPart = `${anion.symbol}${anionSub}`;
  }

  steps.push(`Combine cation first, then anion: ${cationPart}${anionPart}. (Subscript 1 is omitted)`);

  return {
    formula: `${cationPart}${anionPart}`,
    cationCount: cationSub,
    anionCount: anionSub,
    steps,
  };
}

/**
 * Generate IUPAC and Traditional names with color-coded parts
 */
export function buildCompoundName(cation: Cation, anion: Anion): NamingResult {
  const { formula, cationCount, anionCount, steps } = buildIonicFormula(cation, anion);

  let iupacName = '';
  let traditionalName: string | undefined = undefined;
  let ruleTitle = '';
  const parts: ColorPart[] = [];

  // Determine Rule Category
  if (!cation.isVariable && !cation.isPolyatomic && !anion.isPolyatomic) {
    // Rule: Metal with One Oxidation Number + Nonmetal
    ruleTitle = 'Metal with One Oxidation Number + Nonmetal';
    iupacName = `${cation.name} ${anion.name}`;
    parts.push(
      { text: cation.name, type: 'metal' },
      { text: ' ', type: 'neutral' },
      { text: anion.name, type: 'ending' }
    );
  } else if (cation.isVariable && !anion.isPolyatomic) {
    // Rule: Metal with Variable Oxidation Number + Nonmetal
    ruleTitle = 'Metal with Variable Oxidation Number + Nonmetal';
    const roman = toRomanNumeral(cation.charge);
    iupacName = `${cation.name} (${roman}) ${anion.name}`;

    parts.push(
      { text: cation.name, type: 'metal' },
      { text: ' (', type: 'neutral' },
      { text: roman, type: 'oxidation' },
      { text: ') ', type: 'neutral' },
      { text: anion.name, type: 'ending' }
    );

    // Traditional name
    const varMeta = VARIABLE_VALENCE_METALS.find((m) => m.symbol === cation.symbol);
    if (varMeta) {
      const stemName = cation.charge === varMeta.ous ? varMeta.ousName : varMeta.icName;
      traditionalName = `${stemName} ${anion.name}`;
    }
  } else if (!cation.isVariable && anion.isPolyatomic) {
    // Rule: Metal with One Oxidation Number + Polyatomic Ion
    ruleTitle = 'Metal with One Oxidation Number + Polyatomic Ion';
    iupacName = `${cation.name} ${anion.name}`;
    parts.push(
      { text: cation.name, type: 'metal' },
      { text: ' ', type: 'neutral' },
      { text: anion.name, type: 'ending' }
    );
  } else if (cation.isVariable && anion.isPolyatomic) {
    // Rule: Metal with Variable Oxidation Number + Polyatomic Ion
    ruleTitle = 'Metal with Variable Oxidation Number + Polyatomic Ion';
    const roman = toRomanNumeral(cation.charge);
    iupacName = `${cation.name} (${roman}) ${anion.name}`;

    parts.push(
      { text: cation.name, type: 'metal' },
      { text: ' (', type: 'neutral' },
      { text: roman, type: 'oxidation' },
      { text: ') ', type: 'neutral' },
      { text: anion.name, type: 'ending' }
    );

    const varMeta = VARIABLE_VALENCE_METALS.find((m) => m.symbol === cation.symbol);
    if (varMeta) {
      const stemName = cation.charge === varMeta.ous ? varMeta.ousName : varMeta.icName;
      traditionalName = `${stemName} ${anion.name}`;
    }
  } else {
    // Polyatomic cation like NH4+
    ruleTitle = 'Metal with One Oxidation Number + Polyatomic Ion';
    iupacName = `${cation.name} ${anion.name}`;
    parts.push(
      { text: cation.name, type: 'metal' },
      { text: ' ', type: 'neutral' },
      { text: anion.name, type: 'ending' }
    );
  }

  return {
    formula,
    displayFormula: formula,
    iupacName,
    traditionalName,
    ruleTitle,
    parts,
    cationCount,
    anionCount,
    steps,
  };
}

/**
 * Handle Covalent Nonmetal + Nonmetal Compounds
 */
export function buildCovalentName(
  firstElement: string,
  firstCount: number,
  secondStem: string,
  secondCount: number,
  isOxide: boolean = false
): { name: string; parts: ColorPart[] } {
  const getPrefix = (count: number, isFirst: boolean): string => {
    if (isFirst && count === 1) return '';
    const item = GREEK_PREFIXES.find((p) => p.count === count);
    let p = item ? item.prefix : '';
    // drop 'a' or 'o' before oxide
    if (isOxide && (p.endsWith('a') || p.endsWith('o')) && p !== 'di' && p !== 'tri') {
      p = p.slice(0, -1);
    }
    return p;
  };

  const p1 = getPrefix(firstCount, true);
  const p2 = getPrefix(secondCount, false);
  const ending = isOxide ? 'oxide' : `${secondStem}ide`;

  const parts: ColorPart[] = [];
  if (p1) parts.push({ text: p1, type: 'prefix' });
  parts.push({ text: firstElement.toLowerCase(), type: 'metal' });
  parts.push({ text: ' ', type: 'neutral' });
  parts.push({ text: p2, type: 'prefix' });
  parts.push({ text: ending, type: 'ending' });

  const name = `${p1}${firstElement.toLowerCase()} ${p2}${ending}`;
  return { name, parts };
}

/**
 * Lookup or solve compound by formula or name
 */
export function solveCompound(query: string): NamingResult | null {
  const clean = query.trim();
  const cleanUnformatted = unformatSubscripts(clean);

  // 1. Check special cases
  if (cleanUnformatted.toUpperCase() === 'H2O') {
    return {
      formula: 'H2O',
      displayFormula: 'H2O',
      iupacName: 'water',
      traditionalName: 'water (neutral molecular substance)',
      ruleTitle: 'Hydrogen + Polyatomic Ion (Ternary Acids)',
      parts: [
        { text: 'water', type: 'ending' },
        { text: ' (neutral molecular compound, not an acid)', type: 'neutral' },
      ],
      cationCount: 2,
      anionCount: 1,
      steps: ['H2O is common water. It is a neutral covalent compound and is never named as an acid.'],
    };
  }

  // 2. Check Binary Acids
  const binaryAcid = BINARY_ACIDS.find(
    (a) =>
      a.formula.toUpperCase() === cleanUnformatted.toUpperCase() ||
      a.name.toLowerCase() === clean.toLowerCase()
  );
  if (binaryAcid) {
    return {
      formula: binaryAcid.formula,
      displayFormula: binaryAcid.formula,
      iupacName: binaryAcid.name,
      ruleTitle: 'Hydrogen + Halogen (Binary Acids)',
      parts: [
        { text: 'hydro', type: 'prefix' },
        { text: binaryAcid.stem, type: 'metal' },
        { text: 'ic acid', type: 'ending' },
      ],
      cationCount: 1,
      anionCount: 1,
      steps: [
        'Compound is an aqueous hydrogen halide: H + halogen.',
        'Prefix "hydro-" attached to the nonmetal root.',
        'Suffix "-ic acid" added to the end.',
      ],
    };
  }

  // 3. Check Ternary Acids
  const ternaryAcid = TERNARY_ACIDS.find(
    (a) =>
      a.formula.toUpperCase() === cleanUnformatted.toUpperCase() ||
      a.name.toLowerCase() === clean.toLowerCase()
  );
  if (ternaryAcid) {
    const isIte = ternaryAcid.name.includes('ous');
    return {
      formula: ternaryAcid.formula,
      displayFormula: ternaryAcid.formula,
      iupacName: ternaryAcid.name,
      ruleTitle: 'Hydrogen + Polyatomic Ion (Ternary Acids)',
      parts: [
        { text: ternaryAcid.name.replace(' acid', ''), type: 'ending' },
        { text: ' ', type: 'neutral' },
        { text: 'acid', type: 'prefix' },
      ],
      cationCount: 1,
      anionCount: 1,
      steps: [
        `Anion present is ${ternaryAcid.anionName} (${ternaryAcid.anionFormula}).`,
        isIte ? 'Anion ending in "-ite" transforms into "-ous acid".' : 'Anion ending in "-ate" transforms into "-ic acid".',
        `No "hydro-" prefix is used for ternary oxyacids. Final name: ${ternaryAcid.name}.`,
      ],
    };
  }

  // 4. Check Covalent Compounds
  const covMatch = BINARY_COVALENT_EXAMPLES.find(
    (c) =>
      c.formula.toUpperCase() === cleanUnformatted.toUpperCase() ||
      c.name.toLowerCase() === clean.toLowerCase()
  );
  if (covMatch) {
    return {
      formula: covMatch.formula,
      displayFormula: covMatch.formula,
      iupacName: covMatch.name,
      ruleTitle: 'Nonmetal + Nonmetal',
      parts: [
        { text: covMatch.first, type: 'metal' },
        { text: ' ', type: 'neutral' },
        { text: covMatch.second, type: 'ending' },
      ],
      cationCount: covMatch.counts[0],
      anionCount: covMatch.counts[1],
      steps: [
        'Compound composed of two nonmetals: use Greek prefixes.',
        'First element takes a prefix only if more than 1 atom.',
        'Second element always takes a prefix and ends in "-ide".',
      ],
    };
  }

  // 5. Try pairing known cations and anions
  for (const cat of CATIONS) {
    for (const an of ANIONS) {
      const res = buildCompoundName(cat, an);
      if (
        res.formula.toUpperCase() === cleanUnformatted.toUpperCase() ||
        res.iupacName.toLowerCase() === clean.toLowerCase() ||
        (res.traditionalName && res.traditionalName.toLowerCase() === clean.toLowerCase())
      ) {
        return res;
      }
    }
  }

  return null;
}

/**
 * Normalizes student answer for forgiving comparison
 */
export function normalizeAnswer(ans: string): string {
  return unformatSubscripts(ans)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\(\s*([ivx]+)\s*\)/g, '($1)') // standardise "iron (II)" and "iron(II)"
    .replace(/\s*-\s*/g, '-');
}

/**
 * Check if student input matches any acceptable answer
 */
export function checkAnswerForgiving(studentInput: string, correctAnswers: string[]): boolean {
  const normStudent = normalizeAnswer(studentInput);
  return correctAnswers.some((ans) => {
    const normAns = normalizeAnswer(ans);
    if (normStudent === normAns) return true;
    // Allow Roman numerals with or without spaces, e.g. "iron (ii) sulfide" vs "iron(ii) sulfide"
    const noSpaceStudent = normStudent.replace(/\s+/g, '');
    const noSpaceAns = normAns.replace(/\s+/g, '');
    return noSpaceStudent === noSpaceAns;
  });
}
