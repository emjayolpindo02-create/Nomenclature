import { ColorPart, NamingResult, Question } from './chemistry';

export type GuideCorner = 'bottom-right' | 'bottom-left' | 'top-right';
export type GuideSize = 'compact' | 'standard' | 'large';
export type GuideAnimationLevel = 'full' | 'simple' | 'still';
export type GuideVisualState = 'idle' | 'listening' | 'thinking' | 'talking';
export type MouthShape = 'closed' | 'small' | 'wide' | 'round' | 'teeth';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface FaceCalibration {
  mouthLeft: NormalizedPoint;
  mouthRight: NormalizedPoint;
  mouthTop: NormalizedPoint;
  chin: NormalizedPoint;
  leftEye: NormalizedPoint;
  rightEye: NormalizedPoint;
  isCustom: boolean;
}

export interface GuideSettings {
  guideEnabled: boolean;
  voiceEnabled: boolean;
  captionsEnabled: boolean;
  welcomeOnStartup: boolean;
  hasSeenWelcome: boolean;
  corner: GuideCorner;
  size: GuideSize;
  animationLevel: GuideAnimationLevel;
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
  muted: boolean;
  voiceProfileVersion?: number;
  calibration: FaceCalibration;
}

export interface MouthPose {
  shape: MouthShape;
  openness: number; // 0 (closed) .. 1 (wide open)
  widthFactor: number; // <1 rounded "oo", >1 wide "ee"
  teethAmount: number; // 0..1 visibility of upper teeth edge
  innerShadow: number; // 0..1 inner-mouth depth shadow
}

export interface WordSpan {
  word: string;
  startChar: number;
  endChar: number;
  estimatedStartMs: number;
  estimatedEndMs: number;
  hasPauseAfter: boolean;
  visemes: MouthShape[];
}

export interface SpeechTimeline {
  text: string;
  words: WordSpan[];
  totalEstimatedMs: number;
}

export interface FaceLifeState {
  blinkAmount: number; // 0 (open) .. 1 (closed)
  headTiltDeg: number;
  headOffsetX: number;
  headOffsetY: number;
  eyebrowLift: number; // 0..1
}

export interface GuideMessage {
  id: string;
  role: 'user' | 'guide';
  text: string;
  formula?: string;
  iupacName?: string;
  traditionalName?: string;
  ruleTitle?: string;
  libraryId?: string;
  parts?: ColorPart[];
  solved?: NamingResult | null;
  examples?: { formula: string; name: string }[];
  steps?: string[];
  blockedByPractice?: boolean;
  outOfScope?: boolean;
}

export interface TourStep {
  id: string;
  title: string;
  speechText: string;
  highlightTarget?: string;
  targetTab?: string;
  targetLibraryId?: string;
}

export type TourId =
  | 'library'
  | 'periodic-table'
  | 'crisscross'
  | 'oxidation-solver'
  | 'flashcards'
  | 'converter'
  | 'wizard'
  | 'practice'
  | 'signin-scores'
  | 'settings';

export interface GuideAppSnapshot {
  currentTab: string;
  currentLibraryId: string;
  isOnline: boolean;
  isSignedIn: boolean;
  username?: string;
  passingScore: number;
  queuedCount: number;
  isCurrentLibraryUnlocked: boolean;
  unlockReason?: string;
  practiceInProgress: boolean;
  activeQuestion?: Question | null;
  isActiveQuestionSubmitted?: boolean;
}
