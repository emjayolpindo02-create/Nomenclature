export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService?: boolean;
  default?: boolean;
}

const NATURAL_MALE_VOICE_PATTERNS: RegExp[] = [
  /\bdaniel\b/i,
  /\balex\b/i,
  /\baaron\b/i,
  /\barthur\b/i,
  /\bandrew\b/i,
  /\bbrian\b/i,
  /\bchristopher\b/i,
  /\bdavid\b/i,
  /\bdavis\b/i,
  /\beddy\b/i,
  /\beric\b/i,
  /\bevan\b/i,
  /\bgeorge\b/i,
  /\bgordon\b/i,
  /\bguy\b/i,
  /\bjames\b/i,
  /\bjoey\b/i,
  /\bjustin\b/i,
  /\blee\b/i,
  /\bliam\b/i,
  /\bmalcolm\b/i,
  /\bmark\b/i,
  /\bmartin\b/i,
  /\bmatthew\b/i,
  /\bnathan\b/i,
  /\boliver\b/i,
  /\bpaul\b/i,
  /\brichard\b/i,
  /\brishi\b/i,
  /\broger\b/i,
  /\brussell\b/i,
  /\bryan\b/i,
  /\bsteffan\b/i,
  /\bstephen\b/i,
  /\bsteven\b/i,
  /\bthomas\b/i,
  /\btom\b/i,
  /\btony\b/i,
  /\bwilliam\b/i,
  /\bmale\b/i,
  /en-gb-x-rjs/i,
  /en-gb-x-gbd/i,
  /en-us-x-iol/i,
  /en-us-x-iom/i,
  /en-us-x-tpf/i,
  /en-us-x-tpd/i,
  /en-au-x-aub/i,
];

// Avoid novelty / robotic / screechy synthesizer voices
const ROBOTIC_OR_NOVELTY_PATTERNS: RegExp[] = [
  /\balbert\b/i,
  /\bbad news\b/i,
  /\bbahh\b/i,
  /\bbells\b/i,
  /\bboing\b/i,
  /\bbubbles\b/i,
  /\bbruce\b/i,
  /\bcellos\b/i,
  /\bderanged\b/i,
  /\bfred\b/i,
  /\bgood news\b/i,
  /\bhysterical\b/i,
  /\bjester\b/i,
  /\bjunior\b/i,
  /\borgan\b/i,
  /\bralph\b/i,
  /\breed\b/i,
  /\brock[o]?\b/i,
  /\bsuperstar\b/i,
  /\btrinoids\b/i,
  /\bwhisper\b/i,
  /\bwobble\b/i,
  /\bzarvox\b/i,
  /\bespeak\b/i,
  /\bcompact\b/i,
];

const FEMALE_VOICE_PATTERNS: RegExp[] = [
  /\bfemale\b/i,
  /\bwoman\b/i,
  /\bgoogle us english\b/i,
  /\bsamantha\b/i,
  /\bzira\b/i,
  /\bvictoria\b/i,
  /\bkaren\b/i,
  /\bmoira\b/i,
  /\btessa\b/i,
  /\bfiona\b/i,
  /\bserena\b/i,
  /\bkate\b/i,
  /\bcatherine\b/i,
  /\ballison\b/i,
  /\bava\b/i,
  /\bsusan\b/i,
  /\bhazel\b/i,
  /\bjenny\b/i,
  /\baria\b/i,
  /\bemma\b/i,
  /\bamy\b/i,
  /\bsonia\b/i,
  /\blibby\b/i,
  /\bnatasha\b/i,
  /\bmichelle\b/i,
  /\bclara\b/i,
  /\bneerja\b/i,
  /\bsara\b/i,
  /\blaura\b/i,
  /\bshelley\b/i,
  /\bsandy\b/i,
  /\bkathy\b/i,
  /\bvicki\b/i,
  /\bprincess\b/i,
  /\bveena\b/i,
  /\blekha\b/i,
  /\bjoanna\b/i,
  /\bkendra\b/i,
  /\bkimberly\b/i,
  /\bsalli\b/i,
  /\bivy\b/i,
  /\bruth\b/i,
  /\bdanielle\b/i,
  /\bflo\b/i,
  /\bgrandma\b/i,
  /en-gb-x-gba/i,
  /en-us-x-sfg/i,
];

const HIGH_CLARITY_VOICE_PATTERNS: RegExp[] = [
  /\bnatural\b/i,
  /\benhanced\b/i,
  /\bpremium\b/i,
  /\bclear\b/i,
];

export function isVoiceLikelyMale(voice: Pick<VoiceLike, 'name' | 'voiceURI'>): boolean {
  const hay = `${voice.name} ${voice.voiceURI}`;
  if (ROBOTIC_OR_NOVELTY_PATTERNS.some((p) => p.test(hay))) return false;
  if (FEMALE_VOICE_PATTERNS.some((p) => p.test(hay))) return false;
  return NATURAL_MALE_VOICE_PATTERNS.some((p) => p.test(hay));
}

export function isVoiceLikelyFemale(voice: Pick<VoiceLike, 'name' | 'voiceURI'>): boolean {
  const hay = `${voice.name} ${voice.voiceURI}`;
  return FEMALE_VOICE_PATTERNS.some((p) => p.test(hay));
}

/**
 * Scores available browser SpeechSynthesis voices to pick the clearest natural English
 * manly voice, avoiding high-pitched female defaults and robotic/novelty synthesizers.
 */
export function scoreVoiceForClearSpeech<T extends VoiceLike>(
  voice: T,
  preferOffline: boolean = true
): number {
  const hay = `${voice.name} ${voice.voiceURI}`;
  let score = 0;

  if (/^en[-_]US$/i.test(voice.lang)) {
    score += 45;
  } else if (/^en[-_](GB|AU|CA|IE|NZ)$/i.test(voice.lang)) {
    score += 42;
  } else if (/^en\b/i.test(voice.lang)) {
    score += 30;
  } else {
    score -= 140;
  }

  if (ROBOTIC_OR_NOVELTY_PATTERNS.some((p) => p.test(hay))) {
    score -= 150;
  } else if (isVoiceLikelyMale(voice)) {
    score += 95;
  } else if (isVoiceLikelyFemale(voice)) {
    score -= 70;
  }

  if (HIGH_CLARITY_VOICE_PATTERNS.some((p) => p.test(hay))) {
    score += 24;
  }

  if (voice.localService) {
    score += preferOffline ? 22 : 12;
  }

  return score;
}

/**
 * Computes a steady, manly, non-high-pitched utterance pitch without robotic distortion.
 * Gently deepens high-pitched/female system fallback voices if no male OS voice exists.
 */
export function resolveClearManlyPitch(
  requestedPitch: number = 0.84,
  selectedVoice?: Pick<VoiceLike, 'name' | 'voiceURI'> | null
): number {
  const clamped = Math.min(1.15, Math.max(0.65, Number.isFinite(requestedPitch) ? requestedPitch : 0.84));
  if (selectedVoice && isVoiceLikelyFemale(selectedVoice)) {
    return Math.min(clamped, 0.78);
  }
  return clamped;
}

// Keep alias exported so existing imports continue working cleanly
export const scoreVoiceForClearMale = scoreVoiceForClearSpeech;

export function selectPreferredMaleVoice<T extends VoiceLike>(
  voices: T[],
  requestedVoiceURI?: string,
  preferOffline: boolean = true
): T | undefined {
  if (!voices || voices.length === 0) return undefined;

  if (requestedVoiceURI) {
    const exact = voices.find((v) => v.voiceURI === requestedVoiceURI);
    if (exact) return exact;
  }

  let best = voices[0];
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = scoreVoiceForClearSpeech(v, preferOffline);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

export const selectPreferredClearVoice = selectPreferredMaleVoice;

const SUBSCRIPT_TO_ASCII: Record<string, string> = {
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

const SUPERSCRIPT_TO_ASCII: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
};

const ROMAN_MAP: Record<string, string> = {
  I: '1',
  II: '2',
  III: '3',
  IV: '4',
  V: '5',
  VI: '6',
  VII: '7',
  VIII: '8',
};

const KNOWN_FORMULA_WORDS = new Set([
  'I-LAB',
  'IUPAC',
  'PIN',
  'API',
  'OK',
]);

function spellChemicalFormulaToken(token: string): string {
  const withSpaces = token
    .replace(/\(/g, ', ')
    .replace(/\)/g, ', ')
    .replace(/([A-Z])([a-z]?)/g, (_m, upper: string, lower: string) =>
      lower ? `${upper} ${lower.toUpperCase()} ` : `${upper} `
    )
    .replace(/(\d+)/g, ' $1 ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  return withSpaces.replace(/^,\s*/, '').replace(/,\s*$/, '');
}

/**
 * Formats chemistry text (subscripts, Roman numerals, formulas, symbols)
 * so Web Speech synthesis pronounces every compound and rule clearly.
 */
export function formatTextForClearSpeech(text: string): string {
  let out = text
    .replace(/[₀-₉]/g, (ch) => SUBSCRIPT_TO_ASCII[ch] || ch)
    .replace(/[⁰-⁹⁺⁻]/g, (ch) => SUPERSCRIPT_TO_ASCII[ch] || ch)
    .replace(/[✗✓•⭐]/g, ' ')
    .replace(/≥\s*/g, 'at least ')
    .replace(/≤\s*/g, 'at most ')
    .replace(/→|->/g, ' produces ')
    .replace(/—|–/g, ', ')
    .replace(/(\d+)\s*%/g, '$1 percent')
    .replace(/\(\s*(VIII|VII|VI|IV|III|II|I|V)\s*\)/g, (_m, roman: string) => ` ${ROMAN_MAP[roman] || roman} `);

  out = out.replace(
    /\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*)+|[A-Z][a-z]?\d+)\b/g,
    (match) => {
      if (KNOWN_FORMULA_WORDS.has(match)) return match;
      if (/^[A-Z][a-z]+$/.test(match)) return match;
      return spellChemicalFormulaToken(match);
    }
  );

  return out
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
