import { LIBRARY_RULES } from './libraryRules';
import { GuideCorner, TourId, TourStep } from '../types/guide';

export interface GuideQAEntry {
  id: string;
  title: string;
  libraryId?: string;
  keywords: string[];
  answer: string;
  steps?: string[];
  examples?: { formula: string; name: string }[];
}

/**
 * Editable offline FAQ & rule knowledge entries.
 * All answers stay grounded strictly in this app's naming rules and interactive tools.
 */
export const GUIDE_KNOWLEDGE_BASE: GuideQAEntry[] = [
  {
    id: 'greek-prefixes',
    title: 'Greek Prefixes for Covalent Compounds',
    libraryId: 'nonmetal-nonmetal',
    keywords: [
      'prefix',
      'prefixes',
      'greek',
      'mono',
      'di',
      'tri',
      'tetra',
      'penta',
      'hexa',
      'hepta',
      'octa',
      'nona',
      'deca',
      'covalent',
      'two nonmetals',
    ],
    answer:
      'Use Greek prefixes when naming compounds made of two nonmetals: 1 mono-, 2 di-, 3 tri-, 4 tetra-, 5 penta-, 6 hexa-, 7 hepta-, 8 octa-, 9 nona-, and 10 deca-. Never put mono- on the first element, and drop the trailing a or o before oxide.',
    steps: [
      'Prefix the first nonmetal only when there are 2 or more atoms.',
      'Always use a Greek prefix on the second nonmetal and end it in -ide.',
      'Drop trailing a or o before oxide (for example monoxide or pentoxide), but keep di- and tri- whole.',
    ],
    examples: [
      { formula: 'CO', name: 'carbon monoxide' },
      { formula: 'N2O5', name: 'dinitrogen pentoxide' },
    ],
  },
  {
    id: 'ous-and-ic',
    title: 'When to Use -ous and -ic (Stock vs Traditional)',
    libraryId: 'metal-variable-oxidation-nonmetal',
    keywords: [
      '-ous',
      '-ic',
      'ous',
      'ic',
      'traditional',
      'stock',
      'roman',
      'roman numeral',
      'variable',
      'ferrous',
      'ferric',
      'cuprous',
      'cupric',
      'plumbous',
      'plumbic',
      'stannous',
      'stannic',
      'mercurous',
      'mercuric',
      'latin',
    ],
    answer:
      'Metals with more than one oxidation number use either Stock Roman numerals or Traditional Latin endings. The lower charge ends in -ous and the higher charge ends in -ic.',
    steps: [
      'Work backward from the anion charge so total charge equals zero.',
      'For Stock naming, put the metal oxidation number in Roman numerals inside parentheses.',
      'For Traditional naming, attach -ous to the Latin root for the lower charge and -ic for the higher charge.',
    ],
    examples: [
      { formula: 'FeS', name: 'iron (II) sulfide / ferrous sulfide' },
      { formula: 'Fe2S3', name: 'iron (III) sulfide / ferric sulfide' },
    ],
  },
  {
    id: 'binary-acids',
    title: 'Binary Acids (Hydrogen + Halogen)',
    libraryId: 'hydrogen-halogen-binary-acids',
    keywords: [
      'binary acid',
      'binary acids',
      'hydro',
      'hydro-',
      'halogen',
      'hydrochloric',
      'hydrofluoric',
      'hydrobromic',
      'hydroiodic',
    ],
    answer:
      'Binary acids have hydrogen and one halogen with no oxygen. Start with the prefix hydro-, add the halogen root stem, and finish with -ic acid.',
    steps: [
      'Confirm there are only two elements: H and a halogen (F, Cl, Br, or I).',
      'Combine hydro- + halogen stem + -ic acid.',
      'Reverse from the name to formula H plus one halogen atom.',
    ],
    examples: [
      { formula: 'HF', name: 'hydrofluoric acid' },
      { formula: 'HI', name: 'hydroiodic acid' },
    ],
  },
  {
    id: 'ternary-oxyacids',
    title: 'Ternary Acids (Oxyacids) & Water',
    libraryId: 'hydrogen-polyatomic-ternary-acids',
    keywords: [
      'ternary',
      'oxyacid',
      'oxyacids',
      '-ate',
      '-ite',
      'ate',
      'ite',
      'nitric',
      'nitrous',
      'sulfuric',
      'sulfurous',
      'phosphoric',
      'h2o',
      'water',
    ],
    answer:
      'Ternary acids pair hydrogen with an oxygen-containing polyatomic ion. Never use hydro-. If the polyatomic ion ends in -ate, change it to -ic acid; if it ends in -ite, change it to -ous acid.',
    steps: [
      'Identify the polyatomic ion bonded to hydrogen.',
      'Change -ate to -ic acid (for example nitrate gives nitric acid) and -ite to -ous acid (nitrite gives nitrous acid).',
      'Remember that H2O is water, a neutral covalent compound, never an acid.',
    ],
    examples: [
      { formula: 'HNO2', name: 'nitrous acid' },
      { formula: 'HNO3', name: 'nitric acid' },
    ],
  },
  {
    id: 'oxidation-numbers',
    title: 'Oxidation Numbers & Charge Balance',
    libraryId: 'writing-chemical-formulas',
    keywords: [
      'oxidation',
      'oxidation number',
      'oxidation state',
      'charge',
      'valence',
      'balance',
      'zero',
    ],
    answer:
      'An oxidation number shows an atom or ion’s positive or negative combining charge in a compound. In any neutral chemical formula, total positive charge plus total negative charge must equal zero.',
    steps: [
      'Write the positive cation charge first and the negative anion charge second.',
      'Find the smallest ratio of ions whose total charges cancel to zero.',
      'For unknown variable metals, solve algebraically from the known anion charge.',
    ],
    examples: [
      { formula: 'Fe2S3', name: 'iron (III) sulfide (two +3 Fe = +6, three -2 S = -6)' },
      { formula: 'Al2O3', name: 'aluminum oxide (two +3 Al = +6, three -2 O = -6)' },
    ],
  },
  {
    id: 'crisscross-parentheses',
    title: 'Criss-Cross Method & Parentheses',
    libraryId: 'writing-chemical-formulas',
    keywords: [
      'criss-cross',
      'crisscross',
      'parentheses',
      'parenthesis',
      'brackets',
      'subscript',
      'subscripts',
      'reduce',
      'formula writing',
      'write formula',
    ],
    answer:
      'Use the criss-cross method to cross each ion’s charge magnitude into the other ion’s subscript, then reduce to lowest whole numbers. Put parentheses around a polyatomic ion only when its subscript is 2 or more.',
    steps: [
      'Write cation first, anion second.',
      'Cross charge numbers into subscripts and reduce by the greatest common divisor.',
      'Wrap a polyatomic ion in parentheses only if its subscript is greater than 1.',
    ],
    examples: [
      { formula: 'Ca3(PO4)2', name: 'calcium phosphate' },
      { formula: 'NaNO3', name: 'sodium nitrate (no parentheses needed for 1)' },
    ],
  },
  {
    id: 'polyatomic-fixed',
    title: 'Fixed Metal + Polyatomic Ion',
    libraryId: 'metal-one-oxidation-polyatomic',
    keywords: [
      'polyatomic',
      'fixed metal polyatomic',
      'ammonium',
      'nitrate',
      'sulfate',
      'phosphate',
      'carbonate',
      'hydroxide',
    ],
    answer:
      'When a metal has only one oxidation number and pairs with a polyatomic ion, name the metal directly and keep the polyatomic ion’s own ending (-ate, -ite, or -ide for hydroxide/cyanide). Do not add Greek prefixes or Roman numerals.',
    examples: [
      { formula: 'NaNO3', name: 'sodium nitrate' },
      { formula: 'Ca3(PO4)2', name: 'calcium phosphate' },
    ],
  },
  {
    id: 'fixed-binary-ionic',
    title: 'Fixed Metal + Nonmetal (-ide)',
    libraryId: 'metal-one-oxidation-nonmetal',
    keywords: ['fixed metal', 'one oxidation', 'monatomic', 'group 1', 'group 2', 'alkali', '-ide'],
    answer:
      'When a metal has only one fixed oxidation number and pairs with one nonmetal, write the metal name first and change the nonmetal ending to -ide. No Roman numerals or Greek prefixes are needed.',
    examples: [
      { formula: 'ZnS', name: 'zinc sulfide' },
      { formula: 'Li2O', name: 'lithium oxide' },
    ],
  },
  {
    id: 'mercury-dimer',
    title: 'Mercury (I) Dimer Note',
    libraryId: 'metal-variable-oxidation-nonmetal',
    keywords: ['hg2o', 'mercurous', 'mercury (i)', 'mercury i', 'dimer'],
    answer:
      'Mercury (I) exists in paired atoms as [Hg2]2+, meaning each mercury atom has a +1 charge. With one oxide O2-, its formula stays Hg2O (mercury (I) oxide / mercurous oxide).',
    examples: [{ formula: 'Hg2O', name: 'mercury (I) oxide / mercurous oxide' }],
  },
];

export function getSuggestedChipsForTab(tab: string, libraryId?: string): string[] {
  if (tab === 'libraries') {
    if (libraryId === 'nonmetal-nonmetal') {
      return ['What are the prefixes?', 'How do I name N2O5?', 'When do I drop o before oxide?'];
    }
    if (libraryId === 'hydrogen-halogen-binary-acids' || libraryId === 'hydrogen-polyatomic-ternary-acids') {
      return ['How do I name binary acids?', 'When do I use -ous and -ic?', 'Name H2SO4'];
    }
    return ['How do I name FeS?', 'What are the prefixes?', 'When do I use parentheses?'];
  }
  if (tab === 'periodic-table') {
    return ['What is the oxidation number of iron?', 'Is chlorine a metal?', 'What is the symbol of lead?'];
  }
  if (tab === 'crisscross') {
    return ['What is the formula of calcium phosphate?', 'When do I use parentheses?', 'How do I name Fe2S3?'];
  }
  if (tab === 'practice') {
    return ['Why is this topic locked?', 'How do I submit my score?', 'What is an oxidation number?'];
  }
  return ['How do I name FeS?', 'What are the prefixes?', 'Show me the rules for acids'];
}

export function buildLibraryTourSteps(libraryId: string): TourStep[] {
  const rule = LIBRARY_RULES.find((r) => r.id === libraryId) || LIBRARY_RULES[0];
  const steps: TourStep[] = [
    {
      id: 'intro',
      title: `Introducing ${rule.title}`,
      speechText: `Welcome to ${rule.title}. ${rule.ruleSentence}`,
      highlightTarget: 'rule-sentence',
      targetTab: 'libraries',
      targetLibraryId: rule.id,
    },
    {
      id: 'how-to-name',
      title: 'How to Name It',
      speechText: `Here is how to write the name. ${rule.howToNameSteps.join(' ')}`,
      highlightTarget: 'how-to-name',
      targetTab: 'libraries',
      targetLibraryId: rule.id,
    },
    {
      id: 'how-to-read',
      title: 'How to Write the Formula',
      speechText: `Here is how to read the name back into a formula. ${rule.howToReadSteps.join(' ')}`,
      highlightTarget: 'how-to-read',
      targetTab: 'libraries',
      targetLibraryId: rule.id,
    },
  ];

  rule.examples.slice(0, 3).forEach((ex, idx) => {
    const fullName = ex.traditionalName
      ? `${ex.iupacName}, or traditionally ${ex.traditionalName}`
      : ex.iupacName;
    steps.push({
      id: `example-${idx}`,
      title: `Worked Example #${idx + 1}: ${ex.formula}`,
      speechText: `Look at example ${idx + 1}: ${ex.formula} is named ${fullName}. ${ex.explanation}`,
      highlightTarget: `example-${idx}`,
      targetTab: 'libraries',
      targetLibraryId: rule.id,
    });
  });

  if (rule.commonMistakes[0]) {
    steps.push({
      id: 'mistakes',
      title: 'Watch Out for Common Mistakes',
      speechText: `Quick tip before practicing: avoid ${rule.commonMistakes[0].mistake.toLowerCase()} Instead, ${rule.commonMistakes[0].correction}`,
      highlightTarget: 'common-mistakes',
      targetTab: 'libraries',
      targetLibraryId: rule.id,
    });
  }

  steps.push({
    id: 'cheat-sheet',
    title: 'Cheat Sheet & Ready to Practice',
    speechText: `Keep this ${rule.cheatSheet.header} handy while studying, and tap Start Practice whenever you feel ready.`,
    highlightTarget: 'start-practice',
    targetTab: 'libraries',
    targetLibraryId: rule.id,
  });

  return steps;
}

export function getTourSteps(tourId: TourId, currentLibraryId: string): TourStep[] {
  if (tourId === 'library') {
    return buildLibraryTourSteps(currentLibraryId);
  }

  switch (tourId) {
    case 'periodic-table':
      return [
        {
          id: 'pt-1',
          title: 'Periodic Table Explorer',
          speechText:
            'This interactive periodic table holds all 118 elements. Use it to check element symbols, atomic numbers, and oxidation states while naming compounds.',
          highlightTarget: 'pt-header',
          targetTab: 'periodic-table',
        },
        {
          id: 'pt-2',
          title: 'Search & Filter Groups',
          speechText:
            'Search by name, symbol, or Latin root, or filter to spotlight variable-oxidation metals and nonmetals.',
          highlightTarget: 'pt-controls',
          targetTab: 'periodic-table',
        },
        {
          id: 'pt-3',
          title: 'Tap Any Element Card',
          speechText:
            'Tap any element tile to inspect its oxidation states, category, and whether it uses Stock Roman numerals.',
          highlightTarget: 'pt-grid',
          targetTab: 'periodic-table',
        },
      ];

    case 'crisscross':
      return [
        {
          id: 'cc-1',
          title: 'Criss-Cross Formula Builder',
          speechText:
            'In the Criss-Cross Builder, pair any positive cation with a negative anion to see charges balance automatically.',
          highlightTarget: 'tool-header',
          targetTab: 'crisscross',
        },
        {
          id: 'cc-2',
          title: 'Pick Your Cation & Anion',
          speechText:
            'Choose your metal or ammonium cation on the left, and your monatomic or polyatomic anion on the right.',
          highlightTarget: 'tool-workspace',
          targetTab: 'crisscross',
        },
        {
          id: 'cc-3',
          title: 'Check Reduced Formula & Color Parts',
          speechText:
            'Notice how subscripts reduce by the greatest common divisor and how each part of the compound name matches the color legend.',
          highlightTarget: 'tool-result',
          targetTab: 'crisscross',
        },
      ];

    case 'oxidation-solver':
      return [
        {
          id: 'ox-1',
          title: 'Oxidation Number Solver',
          speechText:
            'This solver walks step-by-step through algebra to find the charge on a variable metal inside a formula.',
          highlightTarget: 'tool-header',
          targetTab: 'oxidation-solver',
        },
        {
          id: 'ox-2',
          title: 'Inspect Step-by-Step Balance',
          speechText:
            'Pick a compound or formula to see how the known anion charge reveals the positive metal oxidation number.',
          highlightTarget: 'tool-workspace',
          targetTab: 'oxidation-solver',
        },
      ];

    case 'flashcards':
      return [
        {
          id: 'fc-1',
          title: 'Prefix & Ending Flip Cards',
          speechText:
            'Use these flip cards to drill Greek prefixes, Latin metal roots, and acid endings until they are automatic.',
          highlightTarget: 'tool-header',
          targetTab: 'flashcards',
        },
        {
          id: 'fc-2',
          title: 'Flip to Test Recall',
          speechText:
            'Tap a card to reveal the rule or root stem, then jump to the matching set when ready.',
          highlightTarget: 'tool-workspace',
          targetTab: 'flashcards',
        },
      ];

    case 'converter':
      return [
        {
          id: 'cv-1',
          title: 'Name and Formula Converter',
          speechText:
            'Type either a chemical formula like Fe2S3 or a name like calcium phosphate to see the exact IUPAC and Traditional forms.',
          highlightTarget: 'tool-header',
          targetTab: 'converter',
        },
        {
          id: 'cv-2',
          title: 'Color-Coded Naming Breakdown',
          speechText:
            'Inspect the color-coded parts and jump straight to the matching rule library below.',
          highlightTarget: 'tool-workspace',
          targetTab: 'converter',
        },
      ];

    case 'wizard':
      return [
        {
          id: 'wz-1',
          title: 'Doctor Nomen Q&A Lab',
          speechText:
            'You can ask formula or rule questions here as well, or use this floating virtual guide anytime from any page.',
          highlightTarget: 'tool-header',
          targetTab: 'wizard',
        },
      ];

    case 'practice':
      return [
        {
          id: 'pr-1',
          title: 'Practice Sets & Mastery Unlocks',
          speechText:
            'Practice sets follow the 8 rule libraries in sequence. You can try any unlocked set freely in Guest Mode anytime.',
          highlightTarget: 'practice-header',
          targetTab: 'practice',
        },
        {
          id: 'pr-2',
          title: 'How Unlocking Works',
          speechText:
            'To unlock the next topic, sign in, submit a passing score, and come back tomorrow on the next calendar day.',
          highlightTarget: 'practice-sets',
          targetTab: 'practice',
        },
        {
          id: 'pr-3',
          title: 'Hints & Badges',
          speechText:
            'Tap Need a hint during questions for rule-based coaching without giving away the answer, and collect badges as you pass.',
          highlightTarget: 'practice-badges',
          targetTab: 'practice',
        },
      ];

    case 'signin-scores':
      return [
        {
          id: 'si-1',
          title: 'Signing In & Submitting Scores',
          speechText:
            'Sign in with your username and PIN when you are ready to submit scores or restore your progress on another device.',
          highlightTarget: 'header-signin',
        },
        {
          id: 'si-2',
          title: 'Offline Score Safety',
          speechText:
            'If you finish a practice offline, your attempt is saved safely as Pending on this device and sends automatically without duplicates when you reconnect.',
          highlightTarget: 'practice-signin',
          targetTab: 'practice',
        },
      ];

    case 'settings':
    default:
      return [
        {
          id: 'st-1',
          title: 'Customize Appearance & Learning',
          speechText:
            'In Settings, adjust themes, font size, real chemical subscripts, practice hints, and your virtual guide preferences.',
          highlightTarget: 'settings-guide',
        },
        {
          id: 'st-2',
          title: 'Guide Calibration & Offline Sharing',
          speechText:
            'Use Calibrate Guide to align mouth and eye animation, check your class score connection, or review offline copy updates.',
          highlightTarget: 'settings-sheets',
        },
      ];
  }
}

export function formatCornerLabel(corner: GuideCorner): string {
  switch (corner) {
    case 'bottom-left':
      return 'Bottom Left';
    case 'top-right':
      return 'Top Right';
    case 'bottom-right':
    default:
      return 'Bottom Right';
  }
}
