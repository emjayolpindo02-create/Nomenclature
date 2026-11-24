export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export interface ChemicalElement {
  number: number;
  symbol: string;
  name: string;
  atomicWeight: string;
  category: ElementCategory;
  period: number;
  group: number;
  oxidationStates: number[];
  electronegativity?: number;
  latinName?: string;
  electronConfig: string;
  isVariableOxidationMetal?: boolean;
  commonCharges?: number[];
}

export type IonType = 'monatomic' | 'polyatomic';

export interface Cation {
  id: string;
  name: string;
  symbol: string; // e.g. "Fe", "NH4", "Na"
  charge: number; // e.g. 1, 2, 3, 4
  stockName?: string; // e.g. "iron (II)"
  traditionalName?: string; // e.g. "ferrous"
  isVariable: boolean;
  isPolyatomic: boolean;
  metalStem?: string;
}

export interface Anion {
  id: string;
  name: string;
  symbol: string; // e.g. "Cl", "O", "SO4", "NO3"
  charge: number; // negative number, e.g. -1, -2, -3
  isPolyatomic: boolean;
  stem: string; // e.g. "chlor", "ox", "sulf"
  acidStem?: string; // e.g. "chlor", "sulfur", "phosphor"
  suffixType?: 'ide' | 'ite' | 'ate';
}

export interface ColorPart {
  text: string;
  type: 'metal' | 'oxidation' | 'ending' | 'prefix' | 'neutral';
}

export interface NamingResult {
  formula: string;
  displayFormula: string;
  iupacName: string;
  traditionalName?: string;
  ruleTitle: string;
  parts: ColorPart[];
  cationCount: number;
  anionCount: number;
  steps: string[];
}

export interface WorkedExample {
  formula: string;
  iupacName: string;
  traditionalName?: string;
  explanation: string;
  cation?: string;
  anion?: string;
  parts: ColorPart[];
  elementsInvolved: string[]; // e.g. ['Zn', 'S']
}

export interface LibraryRuleContent {
  id: string;
  title: string;
  ruleSentence: string;
  howToNameSteps: string[];
  howToReadSteps: string[];
  examples: WorkedExample[];
  commonMistakes: {
    mistake: string;
    correction: string;
    why: string;
  }[];
  rememberTips: string[];
  cheatSheet: {
    header: string;
    items: { label: string; value: string; tip?: string }[];
  };
}

export type QuestionType =
  | 'multiple-choice'
  | 'typed-formula'
  | 'typed-name'
  | 'matching'
  | 'oxidation-number';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  formula?: string;
  targetElement?: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  alternateAnswers?: string[];
  matchingPairs?: { left: string; right: string }[];
  explanation: string;
  ruleTitle: string;
  hint?: string;
}

export interface PracticeProgress {
  libraryId: string;
  passed: boolean;
  submitted: boolean;
  bestScore: number; // percentage 0 - 100
  attempts: number;
  passedDate?: string; // YYYY-MM-DD
  officialPassDate?: string; // explicit server pass date YYYY-MM-DD
  passedAt?: string | null;
  completedAt?: string;
}

export type TopicId =
  | 'ionic-compounds'
  | 'polyatomic-ions'
  | 'covalent-compounds'
  | 'acids'
  | 'mixed-practice';

export interface TopicDefinition {
  id: TopicId;
  title: string;
  order: number;
  description: string;
  passingScore: number;
  relatedLibraryIds: string[];
  questions: Question[];
}

export interface TopicProgressEntry {
  passed: boolean;
  score: number;
  bestScore: number;
  attempts: number;
  passedAtMs?: number | null;
  passedAtIso?: string | null;
  passedDateManila?: string | null;
  completedAtIso?: string;
}

export interface DailyRetryState {
  dateKey: string; // YYYY-MM-DD in Asia/Manila
  counts: Record<string, number>;
}

export interface StudentProfile {
  uid: string;
  displayName: string;
  section: string;
  email?: string;
  isAnonymous: boolean;
  approved: boolean;
  blocked: boolean;
  progress: Record<string, TopicProgressEntry>;
  dailyRetries?: DailyRetryState;
  createdAtMs?: number | null;
  updatedAtMs?: number | null;
}

export interface TopicTeacherRule {
  lockedForEveryone?: boolean;
  unlockedForEveryone?: boolean;
  lockedSections?: string[];
  unlockedSections?: string[];
  lockedStudentUids?: string[];
  unlockedStudentUids?: string[];
  openAtMs?: number | null;
  closeAtMs?: number | null;
}

export interface TopicsSettingsDoc {
  maxRetriesPerDay: number;
  topics: Record<string, TopicTeacherRule>;
  updatedAtMs?: number | null;
  updatedBy?: string;
}

export interface QueuedTopicCompletion {
  queueId: string;
  uid: string;
  topicId: TopicId;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  queuedAtIso: string;
}

export interface SectionPolicySettings {
  passingScore: number;
  waitingTimeHours: number;
  inactivityDays: number;
  cooldownMinutes: number;
  sessionExpiryDays: number;
  syncedAt?: string;
}

export interface UserSettings {
  theme: 'sky' | 'cream' | 'mint';
  accentColor: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose' | 'teal' | 'violet';
  fontFamily: 'system' | 'serif' | 'mono' | 'dyslexic';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  density: 'compact' | 'comfortable' | 'spacious';
  cornerRoundness: 'sharp' | 'rounded' | 'soft';
  animations: boolean;
  realSubscripts: boolean;
  periodicColorBy: 'category' | 'block' | 'variable-metal';
  hintsEnabled: boolean;
  passingScore: number; // default 75
}
