import {
  FaceCalibration,
  FaceLifeState,
  GuideAnimationLevel,
  GuideVisualState,
  MouthPose,
  MouthShape,
  SpeechTimeline,
  WordSpan,
} from '../types/guide';

export const DEFAULT_FACE_CALIBRATION: FaceCalibration = {
  mouthLeft: { x: 0.44, y: 0.34 },
  mouthRight: { x: 0.575, y: 0.34 },
  mouthTop: { x: 0.508, y: 0.335 },
  chin: { x: 0.508, y: 0.415 },
  leftEye: { x: 0.44, y: 0.26 },
  rightEye: { x: 0.575, y: 0.26 },
  isCustom: false,
};

export function sanitizeCalibration(raw?: Partial<FaceCalibration> | null): FaceCalibration {
  if (!raw) return { ...DEFAULT_FACE_CALIBRATION };
  const clampPoint = (pt: { x?: number; y?: number } | undefined, fallback: { x: number; y: number }) => {
    const x = typeof pt?.x === 'number' && Number.isFinite(pt.x) ? Math.min(0.95, Math.max(0.05, pt.x)) : fallback.x;
    const y = typeof pt?.y === 'number' && Number.isFinite(pt.y) ? Math.min(0.95, Math.max(0.05, pt.y)) : fallback.y;
    return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
  };

  return {
    mouthLeft: clampPoint(raw.mouthLeft, DEFAULT_FACE_CALIBRATION.mouthLeft),
    mouthRight: clampPoint(raw.mouthRight, DEFAULT_FACE_CALIBRATION.mouthRight),
    mouthTop: clampPoint(raw.mouthTop, DEFAULT_FACE_CALIBRATION.mouthTop),
    chin: clampPoint(raw.chin, DEFAULT_FACE_CALIBRATION.chin),
    leftEye: clampPoint(raw.leftEye, DEFAULT_FACE_CALIBRATION.leftEye),
    rightEye: clampPoint(raw.rightEye, DEFAULT_FACE_CALIBRATION.rightEye),
    isCustom: Boolean(raw.isCustom),
  };
}

export function charToMouthShape(ch: string, nextCh: string = ''): MouthShape {
  const c = ch.toLowerCase();
  const pair = (c + nextCh.toLowerCase()).trim();

  if (pair === 'oo' || pair === 'ou' || pair === 'ow' || c === 'o' || c === 'u' || c === 'w' || c === 'q') {
    return 'round';
  }
  if (
    pair === 'ee' ||
    pair === 'ea' ||
    pair === 'th' ||
    pair === 'sh' ||
    pair === 'ch' ||
    c === 'e' ||
    c === 'i' ||
    c === 'y' ||
    c === 'f' ||
    c === 'v' ||
    c === 's' ||
    c === 'z'
  ) {
    return 'teeth';
  }
  if (c === 'a') {
    return 'wide';
  }
  if (c === 'p' || c === 'b' || c === 'm') {
    return 'closed';
  }
  if (/[a-z0-9]/.test(c)) {
    return 'small';
  }
  return 'closed';
}

export function wordToVisemeSequence(word: string): MouthShape[] {
  const clean = word.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return ['closed'];

  const shapes: MouthShape[] = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const nextCh = clean[i + 1] || '';
    const shape = charToMouthShape(ch, nextCh);
    // Avoid immediate duplicates except keeping syllable rhythm readable
    if (shapes.length === 0 || shapes[shapes.length - 1] !== shape) {
      shapes.push(shape);
    }
  }
  // Ensure at least one visible open shape if word was all p/b/m or numbers
  if (shapes.every((s) => s === 'closed')) {
    return ['small'];
  }
  return shapes.slice(0, 6);
}

function countSyllableUnits(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return 1;
  if (/^\d+$/.test(clean)) return Math.max(1, clean.length);
  const vowelGroups = clean.match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : Math.ceil(clean.length / 3));
}

export function buildSpeechTimeline(text: string, rate: number = 1.0): SpeechTimeline {
  const safeRate = Math.max(0.5, Math.min(2.0, Number.isFinite(rate) ? rate : 1.0));
  const words: WordSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let cursorMs = 0;

  while ((match = regex.exec(text)) !== null) {
    const rawWord = match[0];
    const startChar = match.index;
    const endChar = startChar + rawWord.length;
    const syllables = countSyllableUnits(rawWord);
    const baseWordMs = Math.max(170, Math.min(820, (125 + syllables * 145) / safeRate));
    const hasLongPause = /[.!?]$/.test(rawWord);
    const hasShortPause = /[,;:—–-]$/.test(rawWord);
    const pauseMs = hasLongPause ? 280 / safeRate : hasShortPause ? 170 / safeRate : 45 / safeRate;

    words.push({
      word: rawWord,
      startChar,
      endChar,
      estimatedStartMs: Math.round(cursorMs),
      estimatedEndMs: Math.round(cursorMs + baseWordMs),
      hasPauseAfter: hasLongPause || hasShortPause,
      visemes: wordToVisemeSequence(rawWord),
    });

    cursorMs += baseWordMs + pauseMs;
  }

  return {
    text,
    words,
    totalEstimatedMs: Math.round(cursorMs),
  };
}

export function shapeToMouthPose(shape: MouthShape, intensity: number = 1): MouthPose {
  const k = Math.max(0, Math.min(1, intensity));
  switch (shape) {
    case 'wide':
      return {
        shape: 'wide',
        openness: 0.88 * k,
        widthFactor: 1.04,
        teethAmount: 0.35 * k,
        innerShadow: 0.85 * k,
      };
    case 'round':
      return {
        shape: 'round',
        openness: 0.64 * k,
        widthFactor: 0.78,
        teethAmount: 0.1 * k,
        innerShadow: 0.78 * k,
      };
    case 'teeth':
      return {
        shape: 'teeth',
        openness: 0.44 * k,
        widthFactor: 1.12,
        teethAmount: 0.75 * k,
        innerShadow: 0.45 * k,
      };
    case 'small':
      return {
        shape: 'small',
        openness: 0.46 * k,
        widthFactor: 0.96,
        teethAmount: 0.25 * k,
        innerShadow: 0.55 * k,
      };
    case 'closed':
    default:
      return {
        shape: 'closed',
        openness: 0,
        widthFactor: 1.0,
        teethAmount: 0,
        innerShadow: 0,
      };
  }
}

export const CLOSED_MOUTH_POSE: MouthPose = shapeToMouthPose('closed', 0);

export interface MouthSampleResult {
  pose: MouthPose;
  activeWordIndex: number;
  finished: boolean;
}

/**
 * Deterministic lip-sync sampler:
 * - Closes mouth during punctuation/inter-word pauses
 * - Anchors cleanly to boundaryWordIndex when browser onboundary fires
 * - Never leaves the mouth frozen open after estimated duration + grace period
 */
export function sampleMouthAnimation(
  timeline: SpeechTimeline,
  elapsedMs: number,
  options?: {
    isSpeaking: boolean;
    boundaryWordIndex?: number | null;
    msSinceLastBoundary?: number;
  }
): MouthSampleResult {
  if (!options?.isSpeaking || timeline.words.length === 0 || elapsedMs < 0) {
    return { pose: CLOSED_MOUTH_POSE, activeWordIndex: -1, finished: true };
  }

  // Safety guard: never freeze mouth open if speech events stop firing past total time
  if (elapsedMs > timeline.totalEstimatedMs + 600) {
    return {
      pose: CLOSED_MOUTH_POSE,
      activeWordIndex: timeline.words.length - 1,
      finished: true,
    };
  }

  // Boundary-driven path (when SpeechSynthesis.onboundary is actively updating)
  if (
    typeof options.boundaryWordIndex === 'number' &&
    options.boundaryWordIndex >= 0 &&
    options.boundaryWordIndex < timeline.words.length &&
    typeof options.msSinceLastBoundary === 'number' &&
    options.msSinceLastBoundary < 700
  ) {
    const span = timeline.words[options.boundaryWordIndex];
    const wordDur = Math.max(150, span.estimatedEndMs - span.estimatedStartMs);
    const localProgress = options.msSinceLastBoundary / wordDur;

    if (localProgress >= 0.95) {
      return {
        pose: CLOSED_MOUTH_POSE,
        activeWordIndex: options.boundaryWordIndex,
        finished: false,
      };
    }

    const visIdx = Math.min(
      span.visemes.length - 1,
      Math.floor(localProgress * span.visemes.length)
    );
    const envelope = Math.sin(Math.min(1, localProgress) * Math.PI);
    return {
      pose: shapeToMouthPose(span.visemes[visIdx], 0.45 + 0.55 * envelope),
      activeWordIndex: options.boundaryWordIndex,
      finished: false,
    };
  }

  // Syllable & punctuation fallback timeline
  for (let i = 0; i < timeline.words.length; i++) {
    const span = timeline.words[i];
    if (elapsedMs < span.estimatedStartMs) {
      // We are in a pause gap before word i -> mouth closed
      return {
        pose: CLOSED_MOUTH_POSE,
        activeWordIndex: Math.max(0, i - 1),
        finished: false,
      };
    }
    if (elapsedMs <= span.estimatedEndMs) {
      const dur = Math.max(120, span.estimatedEndMs - span.estimatedStartMs);
      const localProgress = (elapsedMs - span.estimatedStartMs) / dur;
      const visIdx = Math.min(
        span.visemes.length - 1,
        Math.floor(localProgress * span.visemes.length)
      );
      const envelope = Math.sin(Math.min(1, Math.max(0, localProgress)) * Math.PI);
      return {
        pose: shapeToMouthPose(span.visemes[visIdx], 0.35 + 0.65 * envelope),
        activeWordIndex: i,
        finished: false,
      };
    }
  }

  return {
    pose: CLOSED_MOUTH_POSE,
    activeWordIndex: timeline.words.length - 1,
    finished: elapsedMs >= timeline.totalEstimatedMs,
  };
}

export function findWordIndexForCharIndex(timeline: SpeechTimeline, charIndex: number): number {
  for (let i = 0; i < timeline.words.length; i++) {
    const w = timeline.words[i];
    if (charIndex >= w.startChar && charIndex < w.endChar) {
      return i;
    }
    if (charIndex < w.startChar) {
      return Math.max(0, i - 1);
    }
  }
  return timeline.words.length - 1;
}

export function sampleFaceLifeState(
  timeMs: number,
  state: GuideVisualState,
  reducedMotion: boolean
): FaceLifeState {
  if (reducedMotion) {
    return {
      blinkAmount: 0,
      headTiltDeg: 0,
      headOffsetX: 0,
      headOffsetY: 0,
      eyebrowLift: 0,
    };
  }

  // Natural blink every ~3.8s (~170ms blink window)
  const blinkPeriod = 3800;
  const blinkPhase = ((timeMs % blinkPeriod) + blinkPeriod) % blinkPeriod;
  let blinkAmount = 0;
  if (blinkPhase < 170) {
    blinkAmount = Math.sin((blinkPhase / 170) * Math.PI);
  }

  const t = timeMs / 1000;
  if (state === 'talking') {
    return {
      blinkAmount,
      headTiltDeg: Math.sin(t * 2.1) * 1.4,
      headOffsetX: Math.sin(t * 1.6) * 1.6,
      headOffsetY: Math.sin(t * 3.2) * 1.2,
      eyebrowLift: 0.35 + 0.35 * Math.abs(Math.sin(t * 4.2)),
    };
  }

  if (state === 'listening') {
    return {
      blinkAmount,
      headTiltDeg: -2.0 + Math.sin(t * 1.4) * 0.6,
      headOffsetX: 0,
      headOffsetY: Math.sin(t * 2.2) * 0.8,
      eyebrowLift: 0.4,
    };
  }

  if (state === 'thinking') {
    return {
      blinkAmount: blinkPhase < 170 ? blinkAmount : 0.08,
      headTiltDeg: 2.2 + Math.sin(t * 1.1) * 0.8,
      headOffsetX: Math.sin(t * 1.3) * 1.1,
      headOffsetY: -1.0 + Math.sin(t * 1.7) * 0.6,
      eyebrowLift: 0.25,
    };
  }

  // Idle breathing
  return {
    blinkAmount,
    headTiltDeg: Math.sin(t * 0.9) * 0.7,
    headOffsetX: Math.sin(t * 0.65) * 0.8,
    headOffsetY: Math.sin(t * 1.3) * 1.1,
    eyebrowLift: 0,
  };
}

export function resolveEffectiveAnimationMode(options: {
  requestedLevel: GuideAnimationLevel;
  prefersReducedMotion: boolean;
  appAnimationsEnabled: boolean;
  canvasSupported: boolean;
  isHiddenOrMinimized?: boolean;
}): GuideAnimationLevel {
  if (options.prefersReducedMotion || !options.appAnimationsEnabled) {
    return 'still';
  }
  if (options.requestedLevel === 'still') {
    return 'still';
  }
  if (!options.canvasSupported) {
    return options.requestedLevel === 'full' ? 'simple' : options.requestedLevel;
  }
  return options.requestedLevel;
}
