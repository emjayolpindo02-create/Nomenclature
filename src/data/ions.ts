import { Cation, Anion } from '../types/chemistry';

export const CATIONS: Cation[] = [
  // Fixed oxidation number metals (Group IA, IIA, IIIA, etc.)
  { id: 'li-1', name: 'lithium', symbol: 'Li', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'na-1', name: 'sodium', symbol: 'Na', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'k-1', name: 'potassium', symbol: 'K', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'rb-1', name: 'rubidium', symbol: 'Rb', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'cs-1', name: 'cesium', symbol: 'Cs', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'be-2', name: 'beryllium', symbol: 'Be', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'mg-2', name: 'magnesium', symbol: 'Mg', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'ca-2', name: 'calcium', symbol: 'Ca', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'sr-2', name: 'strontium', symbol: 'Sr', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'ba-2', name: 'barium', symbol: 'Ba', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'al-3', name: 'aluminum', symbol: 'Al', charge: 3, isVariable: false, isPolyatomic: false },
  { id: 'zn-2', name: 'zinc', symbol: 'Zn', charge: 2, isVariable: false, isPolyatomic: false },
  { id: 'ag-1', name: 'silver', symbol: 'Ag', charge: 1, isVariable: false, isPolyatomic: false },
  { id: 'nh4-1', name: 'ammonium', symbol: 'NH4', charge: 1, isVariable: false, isPolyatomic: true },
  { id: 'h-1', name: 'hydrogen', symbol: 'H', charge: 1, isVariable: false, isPolyatomic: false },

  // Variable oxidation number metals
  // Copper (+1, +2)
  { id: 'cu-1', name: 'copper', symbol: 'Cu', charge: 1, stockName: 'copper (I)', traditionalName: 'cuprous', isVariable: true, isPolyatomic: false, metalStem: 'cupr' },
  { id: 'cu-2', name: 'copper', symbol: 'Cu', charge: 2, stockName: 'copper (II)', traditionalName: 'cupric', isVariable: true, isPolyatomic: false, metalStem: 'cupr' },

  // Iron (+2, +3)
  { id: 'fe-2', name: 'iron', symbol: 'Fe', charge: 2, stockName: 'iron (II)', traditionalName: 'ferrous', isVariable: true, isPolyatomic: false, metalStem: 'ferr' },
  { id: 'fe-3', name: 'iron', symbol: 'Fe', charge: 3, stockName: 'iron (III)', traditionalName: 'ferric', isVariable: true, isPolyatomic: false, metalStem: 'ferr' },

  // Cobalt (+2, +3)
  { id: 'co-2', name: 'cobalt', symbol: 'Co', charge: 2, stockName: 'cobalt (II)', traditionalName: 'cobaltous', isVariable: true, isPolyatomic: false },
  { id: 'co-3', name: 'cobalt', symbol: 'Co', charge: 3, stockName: 'cobalt (III)', traditionalName: 'cobaltic', isVariable: true, isPolyatomic: false },

  // Manganese (+2, +4)
  { id: 'mn-2', name: 'manganese', symbol: 'Mn', charge: 2, stockName: 'manganese (II)', traditionalName: 'manganous', isVariable: true, isPolyatomic: false },
  { id: 'mn-4', name: 'manganese', symbol: 'Mn', charge: 4, stockName: 'manganese (IV)', traditionalName: 'manganic', isVariable: true, isPolyatomic: false },

  // Mercury (+1, +2): note Hg2O is mercury (I) oxide / mercurous oxide (dimer ion [Hg2]2+ has 2 Hg with +1 each)
  { id: 'hg-1', name: 'mercury', symbol: 'Hg', charge: 1, stockName: 'mercury (I)', traditionalName: 'mercurous', isVariable: true, isPolyatomic: false, metalStem: 'mercur' },
  { id: 'hg-2', name: 'mercury', symbol: 'Hg', charge: 2, stockName: 'mercury (II)', traditionalName: 'mercuric', isVariable: true, isPolyatomic: false, metalStem: 'mercur' },

  // Tin (+2, +4)
  { id: 'sn-2', name: 'tin', symbol: 'Sn', charge: 2, stockName: 'tin (II)', traditionalName: 'stannous', isVariable: true, isPolyatomic: false, metalStem: 'stann' },
  { id: 'sn-4', name: 'tin', symbol: 'Sn', charge: 4, stockName: 'tin (IV)', traditionalName: 'stannic', isVariable: true, isPolyatomic: false, metalStem: 'stann' },

  // Lead (+2, +4)
  { id: 'pb-2', name: 'lead', symbol: 'Pb', charge: 2, stockName: 'lead (II)', traditionalName: 'plumbous', isVariable: true, isPolyatomic: false, metalStem: 'plumb' },
  { id: 'pb-4', name: 'lead', symbol: 'Pb', charge: 4, stockName: 'lead (IV)', traditionalName: 'plumbic', isVariable: true, isPolyatomic: false, metalStem: 'plumb' },

  // Arsenic (+3, +5)
  { id: 'as-3', name: 'arsenic', symbol: 'As', charge: 3, stockName: 'arsenic (III)', traditionalName: 'arsenous', isVariable: true, isPolyatomic: false },
  { id: 'as-5', name: 'arsenic', symbol: 'As', charge: 5, stockName: 'arsenic (V)', traditionalName: 'arsenic', isVariable: true, isPolyatomic: false },

  // Antimony (+3, +5)
  { id: 'sb-3', name: 'antimony', symbol: 'Sb', charge: 3, stockName: 'antimony (III)', traditionalName: 'antimonous', isVariable: true, isPolyatomic: false },
  { id: 'sb-5', name: 'antimony', symbol: 'Sb', charge: 5, stockName: 'antimony (V)', traditionalName: 'antimonic', isVariable: true, isPolyatomic: false },
];

export const ANIONS: Anion[] = [
  // Monatomic nonmetal anions (-ide)
  { id: 'f-1', name: 'fluoride', symbol: 'F', charge: -1, isPolyatomic: false, stem: 'fluor', acidStem: 'fluor', suffixType: 'ide' },
  { id: 'cl-1', name: 'chloride', symbol: 'Cl', charge: -1, isPolyatomic: false, stem: 'chlor', acidStem: 'chlor', suffixType: 'ide' },
  { id: 'br-1', name: 'bromide', symbol: 'Br', charge: -1, isPolyatomic: false, stem: 'brom', acidStem: 'brom', suffixType: 'ide' },
  { id: 'i-1', name: 'iodide', symbol: 'I', charge: -1, isPolyatomic: false, stem: 'iod', acidStem: 'iod', suffixType: 'ide' },
  { id: 'o-2', name: 'oxide', symbol: 'O', charge: -2, isPolyatomic: false, stem: 'ox', acidStem: 'ox', suffixType: 'ide' },
  { id: 's-2', name: 'sulfide', symbol: 'S', charge: -2, isPolyatomic: false, stem: 'sulf', acidStem: 'sulfur', suffixType: 'ide' },
  { id: 'n-3', name: 'nitride', symbol: 'N', charge: -3, isPolyatomic: false, stem: 'nitr', acidStem: 'nitr', suffixType: 'ide' },
  { id: 'p-3', name: 'phosphide', symbol: 'P', charge: -3, isPolyatomic: false, stem: 'phosph', acidStem: 'phosphor', suffixType: 'ide' },
  { id: 'c-4', name: 'carbide', symbol: 'C', charge: -4, isPolyatomic: false, stem: 'carb', acidStem: 'carb', suffixType: 'ide' },
  { id: 'h-neg1', name: 'hydride', symbol: 'H', charge: -1, isPolyatomic: false, stem: 'hydr', acidStem: '', suffixType: 'ide' },

  // Polyatomic anions
  { id: 'no3-1', name: 'nitrate', symbol: 'NO3', charge: -1, isPolyatomic: true, stem: 'nitr', acidStem: 'nitr', suffixType: 'ate' },
  { id: 'no2-1', name: 'nitrite', symbol: 'NO2', charge: -1, isPolyatomic: true, stem: 'nitr', acidStem: 'nitr', suffixType: 'ite' },
  { id: 'so4-2', name: 'sulfate', symbol: 'SO4', charge: -2, isPolyatomic: true, stem: 'sulf', acidStem: 'sulfur', suffixType: 'ate' },
  { id: 'so3-2', name: 'sulfite', symbol: 'SO3', charge: -2, isPolyatomic: true, stem: 'sulf', acidStem: 'sulfur', suffixType: 'ite' },
  { id: 'po4-3', name: 'phosphate', symbol: 'PO4', charge: -3, isPolyatomic: true, stem: 'phosph', acidStem: 'phosphor', suffixType: 'ate' },
  { id: 'po3-3', name: 'phosphite', symbol: 'PO3', charge: -3, isPolyatomic: true, stem: 'phosph', acidStem: 'phosphor', suffixType: 'ite' },
  { id: 'co3-2', name: 'carbonate', symbol: 'CO3', charge: -2, isPolyatomic: true, stem: 'carbon', acidStem: 'carbon', suffixType: 'ate' },
  { id: 'hco3-1', name: 'bicarbonate', symbol: 'HCO3', charge: -1, isPolyatomic: true, stem: 'bicarbon', suffixType: 'ate' },
  { id: 'oh-1', name: 'hydroxide', symbol: 'OH', charge: -1, isPolyatomic: true, stem: 'hydrox', suffixType: 'ide' },
  { id: 'c2o4-2', name: 'oxalate', symbol: 'C2O4', charge: -2, isPolyatomic: true, stem: 'oxal', acidStem: 'oxal', suffixType: 'ate' },
  { id: 'io3-1', name: 'iodate', symbol: 'IO3', charge: -1, isPolyatomic: true, stem: 'iod', acidStem: 'iod', suffixType: 'ate' },
  { id: 'io2-1', name: 'iodite', symbol: 'IO2', charge: -1, isPolyatomic: true, stem: 'iod', acidStem: 'iod', suffixType: 'ite' },
  { id: 'clo3-1', name: 'chlorate', symbol: 'ClO3', charge: -1, isPolyatomic: true, stem: 'chlor', acidStem: 'chlor', suffixType: 'ate' },
  { id: 'clo2-1', name: 'chlorite', symbol: 'ClO2', charge: -1, isPolyatomic: true, stem: 'chlor', acidStem: 'chlor', suffixType: 'ite' },
  { id: 'clo-1', name: 'hypochlorite', symbol: 'ClO', charge: -1, isPolyatomic: true, stem: 'hypochlor', acidStem: 'hypochlor', suffixType: 'ite' },
  { id: 'clo4-1', name: 'perchlorate', symbol: 'ClO4', charge: -1, isPolyatomic: true, stem: 'perchlor', acidStem: 'perchlor', suffixType: 'ate' },
  { id: 'cro4-2', name: 'chromate', symbol: 'CrO4', charge: -2, isPolyatomic: true, stem: 'chrom', acidStem: 'chrom', suffixType: 'ate' },
  { id: 'cr2o7-2', name: 'dichromate', symbol: 'Cr2O7', charge: -2, isPolyatomic: true, stem: 'dichrom', acidStem: 'dichrom', suffixType: 'ate' },
  { id: 'mno4-1', name: 'permanganate', symbol: 'MnO4', charge: -1, isPolyatomic: true, stem: 'permangan', acidStem: 'permangan', suffixType: 'ate' },
  { id: 'cn-1', name: 'cyanide', symbol: 'CN', charge: -1, isPolyatomic: true, stem: 'cyan', acidStem: 'cyan', suffixType: 'ide' },
  { id: 'ch3coo-1', name: 'acetate', symbol: 'CH3COO', charge: -1, isPolyatomic: true, stem: 'acet', acidStem: 'acet', suffixType: 'ate' },
];

export const GREEK_PREFIXES: { prefix: string; count: number; note?: string }[] = [
  { count: 1, prefix: 'mono', note: 'Never used on the first element. Drops "o" before oxide (monoxide).' },
  { count: 2, prefix: 'di', note: 'Does not drop vowel (dioxide).' },
  { count: 3, prefix: 'tri', note: 'Does not drop vowel (trioxide).' },
  { count: 4, prefix: 'tetra', note: 'Drops "a" before oxide (tetroxide).' },
  { count: 5, prefix: 'penta', note: 'Drops "a" before oxide (pentoxide).' },
  { count: 6, prefix: 'hexa', note: 'Drops "a" before oxide (hexoxide).' },
  { count: 7, prefix: 'hepta', note: 'Drops "a" before oxide (heptoxide).' },
  { count: 8, prefix: 'octa', note: 'Drops "a" before oxide (octoxide).' },
  { count: 9, prefix: 'nona', note: 'Drops "a" before oxide (nonoxide).' },
  { count: 10, prefix: 'deca', note: 'Drops "a" before oxide (decoxide).' },
];

export const BINARY_COVALENT_EXAMPLES = [
  { formula: 'CO', name: 'carbon monoxide', first: 'carbon', second: 'monoxide', counts: [1, 1] },
  { formula: 'CO2', name: 'carbon dioxide', first: 'carbon', second: 'dioxide', counts: [1, 2] },
  { formula: 'N2O5', name: 'dinitrogen pentoxide', first: 'dinitrogen', second: 'pentoxide', counts: [2, 5] },
  { formula: 'SO2', name: 'sulfur dioxide', first: 'sulfur', second: 'dioxide', counts: [1, 2] },
  { formula: 'SO3', name: 'sulfur trioxide', first: 'sulfur', second: 'trioxide', counts: [1, 3] },
  { formula: 'NO', name: 'nitrogen monoxide', first: 'nitrogen', second: 'monoxide', counts: [1, 1] },
  { formula: 'NO2', name: 'nitrogen dioxide', first: 'nitrogen', second: 'dioxide', counts: [1, 2] },
  { formula: 'N2O', name: 'dinitrogen monoxide', first: 'dinitrogen', second: 'monoxide', counts: [2, 1] },
  { formula: 'PCl3', name: 'phosphorus trichloride', first: 'phosphorus', second: 'trichloride', counts: [1, 3] },
  { formula: 'PCl5', name: 'phosphorus pentachloride', first: 'phosphorus', second: 'pentachloride', counts: [1, 5] },
  { formula: 'SF6', name: 'sulfur hexafluoride', first: 'sulfur', second: 'hexafluoride', counts: [1, 6] },
  { formula: 'CCl4', name: 'carbon tetrachloride', first: 'carbon', second: 'tetrachloride', counts: [1, 4] },
];

export const BINARY_ACIDS = [
  { formula: 'HF', name: 'hydrofluoric acid', halogen: 'fluorine', stem: 'fluor' },
  { formula: 'HCl', name: 'hydrochloric acid', halogen: 'chlorine', stem: 'chlor' },
  { formula: 'HBr', name: 'hydrobromic acid', halogen: 'bromine', stem: 'brom' },
  { formula: 'HI', name: 'hydroiodic acid', halogen: 'iodine', stem: 'iod' },
  { formula: 'H2S', name: 'hydrosulfuric acid', halogen: 'sulfur', stem: 'sulfur' },
  { formula: 'HCN', name: 'hydrocyanic acid', halogen: 'cyanide', stem: 'cyan' },
];

export const TERNARY_ACIDS = [
  { formula: 'HNO2', name: 'nitrous acid', anionName: 'nitrite', anionFormula: 'NO2' },
  { formula: 'HNO3', name: 'nitric acid', anionName: 'nitrate', anionFormula: 'NO3' },
  { formula: 'H2SO3', name: 'sulfurous acid', anionName: 'sulfite', anionFormula: 'SO3' },
  { formula: 'H2SO4', name: 'sulfuric acid', anionName: 'sulfate', anionFormula: 'SO4' },
  { formula: 'H3PO3', name: 'phosphorous acid', anionName: 'phosphite', anionFormula: 'PO3' },
  { formula: 'H3PO4', name: 'phosphoric acid', anionName: 'phosphate', anionFormula: 'PO4' },
  { formula: 'H2CO3', name: 'carbonic acid', anionName: 'carbonate', anionFormula: 'CO3' },
  { formula: 'H2C2O4', name: 'oxalic acid', anionName: 'oxalate', anionFormula: 'C2O4' },
  { formula: 'HIO2', name: 'iodous acid', anionName: 'iodite', anionFormula: 'IO2' },
  { formula: 'HIO3', name: 'iodic acid', anionName: 'iodate', anionFormula: 'IO3' },
  { formula: 'HClO', name: 'hypochlorous acid', anionName: 'hypochlorite', anionFormula: 'ClO' },
  { formula: 'HClO2', name: 'chlorous acid', anionName: 'chlorite', anionFormula: 'ClO2' },
  { formula: 'HClO3', name: 'chloric acid', anionName: 'chlorate', anionFormula: 'ClO3' },
  { formula: 'HClO4', name: 'perchloric acid', anionName: 'perchlorate', anionFormula: 'ClO4' },
  { formula: 'CH3COOH', name: 'acetic acid', anionName: 'acetate', anionFormula: 'CH3COO' },
];
