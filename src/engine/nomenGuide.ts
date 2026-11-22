import { LIBRARY_RULES } from '../data/libraryRules';
import { solveCompound } from './namingEngine';
import { NamingResult } from '../types/chemistry';

export interface NomenOfflineResponse {
  reply: string;
  formula: string;
  compoundName: string;
  libraryId: string;
  followUpSuggestion: string;
  solved?: NamingResult | null;
}

export function mapRuleTitleToLibraryId(title: string): string {
  const normalized = title.trim().toLowerCase();
  const exact = LIBRARY_RULES.find((r) => r.title.toLowerCase() === normalized);
  if (exact) return exact.id;

  if (normalized.includes('criss') || normalized.includes('writing chemical')) {
    return 'writing-chemical-formulas';
  }
  if (normalized.includes('variable') && normalized.includes('polyatomic')) {
    return 'metal-variable-oxidation-polyatomic';
  }
  if (normalized.includes('one oxidation') && normalized.includes('polyatomic')) {
    return 'metal-one-oxidation-polyatomic';
  }
  if (normalized.includes('variable') && normalized.includes('nonmetal')) {
    return 'metal-variable-oxidation-nonmetal';
  }
  if (normalized.includes('one oxidation') && normalized.includes('nonmetal')) {
    return 'metal-one-oxidation-nonmetal';
  }
  if (normalized.includes('nonmetal + nonmetal') || normalized.includes('covalent') || normalized.includes('prefix')) {
    return 'nonmetal-nonmetal';
  }
  if (normalized.includes('halogen') || normalized.includes('binary acid')) {
    return 'hydrogen-halogen-binary-acids';
  }
  if (normalized.includes('ternary') || normalized.includes('polyatomic ion')) {
    return 'hydrogen-polyatomic-ternary-acids';
  }
  return '';
}

function extractCandidateTokens(query: string): string[] {
  const cleaned = query
    .replace(/[?!.,:;"']/g, ' ')
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const candidates: string[] = [];

  // Single formula-like tokens (e.g., Fe2S3, Ca3(PO4)2, HNO3)
  for (const token of tokens) {
    if (/[A-Z]/.test(token) && token.length >= 2 && token.length <= 24) {
      candidates.push(token);
    }
  }

  // Multi-word compound name phrases (2 to 4 words)
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      candidates.push(tokens.slice(i, i + len).join(' '));
    }
  }

  candidates.push(cleaned);
  return candidates;
}

export function answerLocallyWithNomenGuide(question: string): NomenOfflineResponse {
  const trimmed = question.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check if the question references a specific compound formula or name
  const candidates = extractCandidateTokens(trimmed);
  for (const candidate of candidates) {
    const solved = solveCompound(candidate);
    if (solved) {
      const libraryId = mapRuleTitleToLibraryId(solved.ruleTitle);
      const tradPart = solved.traditionalName
        ? ` Its traditional Latin name is ${solved.traditionalName}.`
        : '';
      const stepsSummary = solved.steps.slice(0, 2).join(' ');
      return {
        reply: `${solved.formula} is named ${solved.iupacName}.${tradPart} ${stepsSummary}`.trim(),
        formula: solved.formula,
        compoundName: solved.traditionalName
          ? `${solved.iupacName} / ${solved.traditionalName}`
          : solved.iupacName,
        libraryId,
        followUpSuggestion: `Show me another example under ${solved.ruleTitle}.`,
        solved,
      };
    }
  }

  // 2. Match conversational greetings or identity questions
  if (/^(hi|hello|hey|good morning|good afternoon|who are you)\b/.test(lower)) {
    return {
      reply:
        "Hello! I'm Doctor Nomen, your chemistry naming lab tutor. Type or speak any compound like Fe2S3 or Ca3(PO4)2, or ask me about any naming rule!",
      formula: '',
      compoundName: '',
      libraryId: 'writing-chemical-formulas',
      followUpSuggestion: 'How do I name Pb(NO3)4?',
    };
  }

  const wantsMistake =
    lower.includes('mistake') || lower.includes('avoid') || lower.includes('wrong');
  const wantsSteps =
    lower.includes('step') || lower.includes('how to') || lower.includes('how do');
  const wantsAnotherExample = lower.includes('another example');

  const formatRuleResponse = (rule: (typeof LIBRARY_RULES)[number]): NomenOfflineResponse => {
    const ex = wantsAnotherExample && rule.examples[1] ? rule.examples[1] : rule.examples[0];
    const exName = ex.traditionalName
      ? `${ex.iupacName} (${ex.traditionalName})`
      : ex.iupacName;

    let reply = `${rule.ruleSentence} For example, ${ex.formula} is named ${exName}.`;
    if (wantsMistake && rule.commonMistakes[0]) {
      const m = rule.commonMistakes[0];
      reply = `Watch out for this common mistake in ${rule.title}: avoid ${m.mistake.toLowerCase()} Instead, ${m.correction}`;
    } else if (wantsSteps && rule.howToNameSteps.length > 0) {
      reply = `${rule.title}: ${rule.howToNameSteps.slice(0, 2).join(' ')} For example, ${ex.formula} is ${exName}.`;
    }

    return {
      reply,
      formula: ex.formula,
      compoundName: ex.traditionalName ? `${ex.iupacName} / ${ex.traditionalName}` : ex.iupacName,
      libraryId: rule.id,
      followUpSuggestion: wantsMistake
        ? `Show me another example under ${rule.title}.`
        : `What is a common mistake in ${rule.title}?`,
    };
  };

  // 3. Direct rule title match (great for follow-up chips referencing rule titles)
  for (const rule of LIBRARY_RULES) {
    if (lower.includes(rule.title.toLowerCase())) {
      return formatRuleResponse(rule);
    }
  }

  // 4. Match against the 8 rule libraries by topic keywords
  const keywordRules: { libraryId: string; keywords: string[] }[] = [
    {
      libraryId: 'writing-chemical-formulas',
      keywords: ['criss-cross', 'crisscross', 'parenthes', 'subscript', 'write formula', 'writing formula', 'reduce', 'ratio', 'cation first'],
    },
    {
      libraryId: 'metal-variable-oxidation-polyatomic',
      keywords: ['variable', 'roman numeral', 'latin', 'plumb', 'ferr', 'cupr', 'stann', 'mercur', 'polyatomic'],
    },
    {
      libraryId: 'metal-variable-oxidation-nonmetal',
      keywords: ['variable', 'roman numeral', 'stock', 'traditional', 'ferrous', 'ferric', 'cuprous', 'cupric', 'mercurous', 'mercuric', 'stannous', 'stannic', 'plumbous', 'plumbic', '-ous', '-ic'],
    },
    {
      libraryId: 'hydrogen-polyatomic-ternary-acids',
      keywords: ['ternary', 'oxyacid', '-ate', '-ite', 'water', 'h2o', 'nitric', 'nitrous', 'sulfuric', 'sulfurous', 'phosphoric'],
    },
    {
      libraryId: 'hydrogen-halogen-binary-acids',
      keywords: ['binary acid', 'hydro-', 'halogen', 'hydrofluoric', 'hydrochloric', 'hydrobromic', 'hydroiodic'],
    },
    {
      libraryId: 'nonmetal-nonmetal',
      keywords: ['prefix', 'greek', 'mono', 'di-', 'tri-', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca', 'covalent', 'two nonmetal'],
    },
    {
      libraryId: 'metal-one-oxidation-polyatomic',
      keywords: ['polyatomic', 'nitrate', 'phosphate', 'sulfate', 'carbonate', 'ammonium', 'hydroxide'],
    },
    {
      libraryId: 'metal-one-oxidation-nonmetal',
      keywords: ['fixed', 'one oxidation', '-ide', 'monatomic', 'alkali', 'alkaline'],
    },
  ];

  // Prioritize polyatomic + variable if both mentioned
  for (const entry of keywordRules) {
    if (entry.libraryId === 'metal-variable-oxidation-polyatomic') {
      const hasVar = ['variable', 'roman', 'latin', 'plumb', 'ferr', 'cupr', 'stann', 'mercur'].some((k) => lower.includes(k));
      const hasPoly = ['polyatomic', 'nitrate', 'sulfate', 'phosphate', 'carbonate'].some((k) => lower.includes(k));
      if (hasVar && hasPoly) {
        const rule = LIBRARY_RULES.find((r) => r.id === entry.libraryId)!;
        return formatRuleResponse(rule);
      }
      continue;
    }

    if (entry.keywords.some((k) => lower.includes(k))) {
      const rule = LIBRARY_RULES.find((r) => r.id === entry.libraryId);
      if (rule) {
        return formatRuleResponse(rule);
      }
    }
  }

  // 5. General guidance across all 8 topics
  return {
    reply:
      'I can help with all 8 compound naming rules: writing formulas with criss-cross, fixed and variable metals, covalent Greek prefixes, binary acids, polyatomic compounds, and ternary acids. Ask me a question or type any formula like Fe2S3 or HNO3.',
    formula: '',
    compoundName: '',
    libraryId: 'writing-chemical-formulas',
    followUpSuggestion: 'How do I name Pb(NO3)4?',
  };
}
