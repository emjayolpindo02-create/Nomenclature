import { ELEMENTS } from '../data/elements';
import { ANIONS, BINARY_ACIDS, BINARY_COVALENT_EXAMPLES, CATIONS, TERNARY_ACIDS } from '../data/ions';
import { LIBRARY_RULES } from '../data/libraryRules';
import { GUIDE_KNOWLEDGE_BASE, GuideQAEntry } from '../data/guideKnowledge';
import { solveCompound } from './namingEngine';
import { mapRuleTitleToLibraryId } from './nomenGuide';
import { ChemicalElement, NamingResult, Question } from '../types/chemistry';
import { GuideAppSnapshot } from '../types/guide';

export interface GuideBrainReply {
  text: string;
  formula?: string;
  iupacName?: string;
  traditionalName?: string;
  ruleTitle?: string;
  libraryId?: string;
  parts?: NamingResult['parts'];
  solved?: NamingResult | null;
  examples?: { formula: string; name: string }[];
  steps?: string[];
  blockedByPractice?: boolean;
  outOfScope?: boolean;
}

const STOP_WORDS = new Set([
  'what',
  'is',
  'the',
  'a',
  'an',
  'of',
  'for',
  'to',
  'do',
  'i',
  'how',
  'can',
  'you',
  'tell',
  'me',
  'name',
  'formula',
  'chemical',
  'compound',
  'does',
  'are',
  'when',
  'why',
  'in',
  'on',
  'with',
  'and',
  'or',
  'this',
  'that',
  'please',
  'explain',
  'give',
  'show',
  'rules',
  'rule',
  'called',
  'write',
  'read',
  'it',
  'be',
  'as',
  'no',
  'yes',
  'am',
  'at',
  'by',
  'he',
  'we',
  'my',
  'or',
  'so',
]);

/**
 * Simple Damerau/Levenshtein edit distance for offline typo tolerance.
 */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - editDistance(s1, s2) / maxLen;
}

function buildKnownCompoundNames(): string[] {
  const names = new Set<string>();
  BINARY_ACIDS.forEach((a) => names.add(a.name.toLowerCase()));
  TERNARY_ACIDS.forEach((a) => names.add(a.name.toLowerCase()));
  BINARY_COVALENT_EXAMPLES.forEach((c) => names.add(c.name.toLowerCase()));
  for (const cat of CATIONS) {
    for (const an of ANIONS) {
      if (cat.isVariable) {
        names.add(`${cat.stockName} ${an.name}`.toLowerCase());
        if (cat.traditionalName) names.add(`${cat.traditionalName} ${an.name}`.toLowerCase());
      } else {
        names.add(`${cat.name} ${an.name}`.toLowerCase());
      }
    }
  }
  return Array.from(names);
}

const KNOWN_COMPOUND_NAMES = buildKnownCompoundNames();

function extractCandidateCompoundPhrases(query: string): string[] {
  const cleaned = query.replace(/[?!.,:;"']/g, ' ').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const candidates: string[] = [];

  // Formula-like tokens (e.g., Fe2S3, Ca3(PO4)2, HNO3, H2SO4, Pb(NO3)4)
  for (const tok of tokens) {
    if (/^[A-Z][a-zA-Z0-9()]*$/.test(tok) && tok.length >= 2 && tok.length <= 24) {
      candidates.push(tok);
    }
  }

  // Sub-phrases up to 4 words
  for (let len = Math.min(4, tokens.length); len >= 2; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      candidates.push(tokens.slice(i, i + len).join(' '));
    }
  }
  candidates.push(cleaned);
  return candidates;
}

function tryFuzzySolveCompound(query: string): NamingResult | null {
  const candidates = extractCandidateCompoundPhrases(query);
  for (const cand of candidates) {
    const exact = solveCompound(cand);
    if (exact) return exact;
  }

  // Fuzzy name check for minor spelling typos (e.g. "calcum phosphat", "ferric sulfid")
  const normalizedQuery = query
    .toLowerCase()
    .replace(/[?!.,:;"']/g, ' ')
    .replace(/\b(what|is|the|formula|of|for|name|how|do|i|write|read)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalizedQuery.length < 5) return null;

  let bestName = '';
  let bestScore = 0;
  for (const known of KNOWN_COMPOUND_NAMES) {
    const score = similarity(normalizedQuery, known);
    if (score > bestScore) {
      bestScore = score;
      bestName = known;
    }
  }

  if (bestScore >= 0.78 && bestName) {
    return solveCompound(bestName);
  }
  return null;
}

function findElementFromQuestion(query: string): ChemicalElement | null {
  const lower = query.toLowerCase().replace(/[?!.,:;"']/g, ' ').trim();
  const tokens = lower.split(/\s+/).filter(Boolean);

  // Only consider periodic-table / element style questions so compound names like "iron sulfide" don't hit first
  const elementCue =
    /\b(element|symbol|oxidation|state|states|charge|metal|nonmetal|metalloid|atomic|weight|period|group|latin|noble|halogen|alkali|alkaline)\b/.test(
      lower
    );

  // Direct full element name match (safe even without cues if single element word)
  for (const el of ELEMENTS) {
    const nameLower = el.name.toLowerCase();
    if (tokens.includes(nameLower)) {
      return el;
    }
  }

  if (!elementCue) return null;

  // Symbol match ONLY if explicit case-sensitive symbol or word after "symbol"/"for"/"of"
  const rawTokens = query.replace(/[?!.,:;"']/g, ' ').trim().split(/\s+/);
  for (const tok of rawTokens) {
    const bySym = ELEMENTS.find((e) => e.symbol === tok);
    if (bySym) return bySym;
  }

  // Fuzzy match against element names (for typos like "chloine", "ironn", "leed")
  for (const tok of tokens) {
    if (tok.length < 3 || STOP_WORDS.has(tok)) continue;
    let best: ChemicalElement | null = null;
    let bestScore = 0;
    for (const el of ELEMENTS) {
      const s = similarity(tok, el.name.toLowerCase());
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }
    if (best && bestScore >= 0.74) return best;
  }

  return null;
}

function classifyElementNature(el: ChemicalElement): string {
  switch (el.category) {
    case 'alkali-metal':
      return 'an alkali metal';
    case 'alkaline-earth':
      return 'an alkaline earth metal';
    case 'transition-metal':
      return 'a transition metal';
    case 'post-transition-metal':
      return 'a post-transition metal';
    case 'metalloid':
      return 'a metalloid (between metals and nonmetals)';
    case 'noble-gas':
      return 'a noble gas nonmetal';
    case 'reactive-nonmetal':
      return 'a reactive nonmetal';
    case 'lanthanide':
      return 'a lanthanide metal';
    case 'actinide':
      return 'an actinide metal';
    default:
      return el.category;
  }
}

function answerElementQuestion(el: ChemicalElement, query: string): GuideBrainReply {
  const lower = query.toLowerCase();
  const oxList = el.oxidationStates.map((s) => (s > 0 ? `+${s}` : `${s}`)).join(', ');
  const isMetal =
    el.category.includes('metal') && el.category !== 'reactive-nonmetal' && el.category !== 'metalloid';
  const nature = classifyElementNature(el);
  const varNote = el.isVariableOxidationMetal
    ? ` It uses variable oxidation charges (${(el.commonCharges || el.oxidationStates).map((c) => `+${c}`).join(' or ')}), so it takes Stock Roman numerals or -ous/-ic endings.`
    : '';
  const latinNote = el.latinName ? ` Its Latin root name is ${el.latinName}.` : '';

  if (lower.includes('symbol')) {
    return {
      text: `The chemical symbol for ${el.name} is ${el.symbol} (atomic number ${el.number}).${latinNote}`,
    };
  }
  if (lower.includes('metal') || lower.includes('nonmetal') || lower.includes('metalloid') || lower.includes('category')) {
    const yesNo = lower.includes('is ') && lower.includes('metal') && !lower.includes('nonmetal')
      ? isMetal
        ? `Yes, ${el.name} (${el.symbol}) is ${nature}.`
        : `No, ${el.name} (${el.symbol}) is ${nature}.`
      : `${el.name} (${el.symbol}) is ${nature}.`;
    return {
      text: `${yesNo} Common oxidation state(s): ${oxList}.${varNote}`,
    };
  }
  if (lower.includes('oxidation') || lower.includes('charge') || lower.includes('valence')) {
    return {
      text: `${el.name} (${el.symbol}) has oxidation state(s) ${oxList}.${varNote}${latinNote}`,
    };
  }

  return {
    text: `${el.name} (symbol ${el.symbol}, atomic number ${el.number}) is ${nature} with oxidation state(s) ${oxList} and atomic weight ${el.atomicWeight}.${varNote}${latinNote}`,
  };
}

function answerAppQuestion(query: string, snapshot?: GuideAppSnapshot): GuideBrainReply | null {
  const lower = query.toLowerCase();
  const passScore = snapshot?.passingScore || 70;

  if (/\b(lock|locked|unlock|tomorrow|next day|blocked|wait)\b/.test(lower)) {
    const extra =
      snapshot?.unlockReason === 'wait-next-day'
        ? ' Your passing score is recorded, and this topic unlocks automatically on the next calendar day.'
        : snapshot?.unlockReason === 'awaiting-sync'
          ? ' Your passing score is queued offline and will record its official date as soon as you reconnect.'
          : '';
    return {
      text: `Topics unlock one step at a time. Pass the previous practice set with at least ${passScore}%, submit your score while signed in, and come back tomorrow.${extra}`,
    };
  }

  if (/\b(submit|score|scores|sign in|signin|login|pin|pending|sync|offline|sheet)\b/.test(lower)) {
    const queueNote =
      snapshot && snapshot.queuedCount > 0
        ? ` You currently have ${snapshot.queuedCount} pending score(s) waiting to send when online.`
        : '';
    const authNote = snapshot?.isSignedIn
      ? ` You are signed in as ${snapshot.username || 'a student'}.`
      : ' Right now you are in Guest Mode; sign in with your username and PIN to send scores.';
    return {
      text: `Finish a practice set, tap Submit my score, and enter your username and PIN. Online scores go straight to your class sheet; offline scores save safely as Pending and send automatically when you reconnect.${authNote}${queueNote}`,
    };
  }

  return null;
}

function matchBestKnowledgeEntry(query: string): { entry: GuideQAEntry; score: number } | null {
  const lower = query.toLowerCase().replace(/[?!.,:;"']/g, ' ');
  const tokens = lower.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return null;

  let bestEntry: GuideQAEntry | null = null;
  let bestScore = 0;

  for (const entry of GUIDE_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        score += kw.includes(' ') ? 3.5 : 2.2;
        continue;
      }
      // Fuzzy token check for spelling typos ("binaary", "prefxies", "oxidaton")
      for (const tok of tokens) {
        if (tok.length >= 4 && kw.length >= 4 && !kw.includes(' ')) {
          const sim = similarity(tok, kw);
          if (sim >= 0.72) {
            score += sim * 1.85;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Fallback to rule titles if no specific knowledge entry matched
  if (!bestEntry || bestScore < 1.2) {
    for (const rule of LIBRARY_RULES) {
      const ruleWords = rule.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
      const matches = tokens.filter((t) => ruleWords.some((rw) => similarity(t, rw) >= 0.78)).length;
      if (matches >= 2) {
        const existing = GUIDE_KNOWLEDGE_BASE.find((g) => g.libraryId === rule.id);
        if (existing && matches * 1.1 > bestScore) {
          bestEntry = existing;
          bestScore = matches * 1.1;
        }
      }
    }
  }

  if (!bestEntry || bestScore < 1.2) return null;
  return { entry: bestEntry, score: bestScore };
}

/**
 * Generates a supportive hint for an active quiz question WITHOUT revealing its answer.
 */
export function buildPracticeHintText(question: Question): string {
  const rule = LIBRARY_RULES.find((r) => r.title.toLowerCase() === question.ruleTitle.toLowerCase());
  const firstStep = rule?.howToNameSteps[0] || '';
  const questionHint = question.hint ? `${question.hint} ` : '';
  return `Let's think through this using ${question.ruleTitle}: ${questionHint}${firstStep}`.trim();
}

/**
 * Generates post-submission feedback for a checked quiz question using the matching rule + a new example.
 */
export function buildPracticeFeedbackReply(
  question: Question,
  wasCorrect: boolean
): GuideBrainReply {
  const libraryId = mapRuleTitleToLibraryId(question.ruleTitle);
  const rule = LIBRARY_RULES.find((r) => r.id === libraryId) || LIBRARY_RULES[0];
  const alternateExample =
    rule.examples.find(
      (ex) =>
        ex.formula.toUpperCase() !== (question.formula || '').toUpperCase() &&
        ex.iupacName.toLowerCase() !== question.correctAnswer.toLowerCase()
    ) || rule.examples[0];

  const exDisplay = alternateExample.traditionalName
    ? `${alternateExample.iupacName} (${alternateExample.traditionalName})`
    : alternateExample.iupacName;

  const prefix = wasCorrect
    ? `Nice work! That was right under ${rule.title}.`
    : `Not quite yet—let's check ${rule.title}.`;

  return {
    text: `${prefix} ${question.explanation} Another example of this rule is ${alternateExample.formula}, named ${exDisplay}.`,
    libraryId: rule.id,
    ruleTitle: rule.title,
    examples: [{ formula: alternateExample.formula, name: exDisplay }],
  };
}

/**
 * Main offline guide Q&A solver.
 * Strictly refuses to reveal answers when a practice question is active and unsubmitted.
 */
export function answerGuideQuestion(
  questionText: string,
  snapshot?: GuideAppSnapshot
): GuideBrainReply {
  const trimmed = questionText.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      text: 'Ask me any compound name, chemical formula, rule question, or element question!',
    };
  }

  // 1. PRACTICE LOCKOUT GUARD: never reveal answers during an active unsubmitted practice question
  if (snapshot?.practiceInProgress && !snapshot.isActiveQuestionSubmitted) {
    if (snapshot.activeQuestion) {
      return {
        text: `While a practice question is open, I cannot give away the answer—let's think through it! ${buildPracticeHintText(snapshot.activeQuestion)}`,
        ruleTitle: snapshot.activeQuestion.ruleTitle,
        libraryId: mapRuleTitleToLibraryId(snapshot.activeQuestion.ruleTitle) || undefined,
        blockedByPractice: true,
      };
    }
    return {
      text: 'While a practice quiz is in progress, I can only share rule hints without giving away the answer. Try identifying whether the ions are fixed metals, variable metals, nonmetals, or acids first.',
      blockedByPractice: true,
    };
  }

  // 2. Conversational greeting
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you)\b/.test(lower)) {
    return {
      text: 'Hello! I am your offline compound naming guide, animated from your teacher’s photo. Ask me to name a formula like Fe2S3, write a formula like calcium phosphate, or review any naming rule.',
      libraryId: snapshot?.currentLibraryId || 'writing-chemical-formulas',
    };
  }

  // 3. Compound formula / name lookup via single namingEngine
  const solved = tryFuzzySolveCompound(trimmed);
  if (solved) {
    const libraryId = mapRuleTitleToLibraryId(solved.ruleTitle);
    const tradNote = solved.traditionalName
      ? ` Traditional name: ${solved.traditionalName}.`
      : '';
    return {
      text: `${solved.formula} is ${solved.iupacName}.${tradNote} Rule: ${solved.ruleTitle}. ${solved.steps[0] || ''}`.trim(),
      formula: solved.formula,
      iupacName: solved.iupacName,
      traditionalName: solved.traditionalName,
      ruleTitle: solved.ruleTitle,
      libraryId: libraryId || undefined,
      parts: solved.parts,
      solved,
      steps: solved.steps,
    };
  }

  // 4. App state questions (locked topics, score submission, pending queue)
  const appReply = answerAppQuestion(trimmed, snapshot);
  if (appReply) {
    return appReply;
  }

  // 5. Periodic Table element lookup
  const matchedElement = findElementFromQuestion(trimmed);
  if (matchedElement) {
    return answerElementQuestion(matchedElement, trimmed);
  }

  // 6. Rule knowledge base (keyword + fuzzy typo tolerant)
  const kbMatch = matchBestKnowledgeEntry(trimmed);
  if (kbMatch) {
    const { entry } = kbMatch;
    const rule = entry.libraryId ? LIBRARY_RULES.find((r) => r.id === entry.libraryId) : undefined;
    const examples =
      entry.examples ||
      (rule
        ? rule.examples.slice(0, 2).map((e) => ({
            formula: e.formula,
            name: e.traditionalName ? `${e.iupacName} / ${e.traditionalName}` : e.iupacName,
          }))
        : undefined);
    return {
      text: entry.answer,
      ruleTitle: rule?.title || entry.title,
      libraryId: entry.libraryId,
      steps: entry.steps || rule?.howToNameSteps.slice(0, 2),
      examples,
    };
  }

  // 7. Honest out-of-scope response (never guess or invent chemistry)
  return {
    text: 'I can only help with naming and reading chemical compounds, periodic table properties, and using this app. Try asking about prefixes, -ous/-ic endings, binary acids, or a formula like Fe2S3 or H2SO4.',
    outOfScope: true,
  };
}
