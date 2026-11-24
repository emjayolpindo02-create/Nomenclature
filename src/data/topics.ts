import { PRACTICE_SETS } from './practiceQuestions';
import { Question, TopicDefinition, TopicId } from '../types/chemistry';

function pickQuestions(setId: string, limit?: number): Question[] {
  const found = PRACTICE_SETS.find((s) => s.id === setId);
  if (!found) return [];
  return typeof limit === 'number' ? found.questions.slice(0, limit) : [...found.questions];
}

export const TOPICS: TopicDefinition[] = [
  {
    id: 'ionic-compounds',
    title: 'Ionic Compounds',
    order: 1,
    description:
      'Practice writing ionic formulas with criss-cross charges, fixed-charge metals, and variable-oxidation metals.',
    passingScore: 75,
    relatedLibraryIds: [
      'writing-chemical-formulas',
      'metal-one-oxidation-nonmetal',
      'metal-variable-oxidation-nonmetal',
    ],
    questions: [
      ...pickQuestions('writing-chemical-formulas', 4),
      ...pickQuestions('metal-one-oxidation-nonmetal', 4),
      ...pickQuestions('metal-variable-oxidation-nonmetal', 4),
    ],
  },
  {
    id: 'polyatomic-ions',
    title: 'Polyatomic Ions',
    order: 2,
    description:
      'Master fixed-charge and variable-charge metals paired with common polyatomic clusters like nitrate, sulfate, and phosphate.',
    passingScore: 75,
    relatedLibraryIds: [
      'metal-one-oxidation-polyatomic',
      'metal-variable-oxidation-polyatomic',
    ],
    questions: [
      ...pickQuestions('metal-one-oxidation-polyatomic', 5),
      ...pickQuestions('metal-variable-oxidation-polyatomic', 5),
    ],
  },
  {
    id: 'covalent-compounds',
    title: 'Covalent Compounds',
    order: 3,
    description:
      'Apply Greek numerical prefixes (mono- through deca-) and vowel-drop rules for nonmetal-nonmetal molecules.',
    passingScore: 75,
    relatedLibraryIds: ['nonmetal-nonmetal'],
    questions: [...pickQuestions('nonmetal-nonmetal')],
  },
  {
    id: 'acids',
    title: 'Acids',
    order: 4,
    description:
      'Distinguish binary hydro-...-ic acids from ternary oxyacids (-ate to -ic, -ite to -ous), plus neutral H2O.',
    passingScore: 75,
    relatedLibraryIds: [
      'hydrogen-halogen-binary-acids',
      'hydrogen-polyatomic-ternary-acids',
    ],
    questions: [
      ...pickQuestions('hydrogen-halogen-binary-acids', 5),
      ...pickQuestions('hydrogen-polyatomic-ternary-acids', 5),
    ],
  },
  {
    id: 'mixed-practice',
    title: 'Mixed Practice',
    order: 5,
    description:
      'Cumulative review across ionic compounds, polyatomic ions, covalent molecules, and binary/ternary acids.',
    passingScore: 75,
    relatedLibraryIds: [
      'writing-chemical-formulas',
      'metal-one-oxidation-nonmetal',
      'metal-variable-oxidation-nonmetal',
      'metal-one-oxidation-polyatomic',
      'metal-variable-oxidation-polyatomic',
      'nonmetal-nonmetal',
      'hydrogen-halogen-binary-acids',
      'hydrogen-polyatomic-ternary-acids',
    ],
    questions: [...pickQuestions('final-mixed-review')],
  },
];

export const TOPIC_MAP: Record<TopicId, TopicDefinition> = TOPICS.reduce(
  (acc, topic) => {
    acc[topic.id] = topic;
    return acc;
  },
  {} as Record<TopicId, TopicDefinition>
);

export const VALID_TOPIC_IDS: TopicId[] = TOPICS.map((t) => t.id);

export function getTopicById(id: string | undefined | null): TopicDefinition | null {
  if (!id) return null;
  return TOPICS.find((t) => t.id === id) || null;
}

export function getTopicForLibraryRule(ruleId: string): TopicId {
  switch (ruleId) {
    case 'writing-chemical-formulas':
    case 'metal-one-oxidation-nonmetal':
    case 'metal-variable-oxidation-nonmetal':
      return 'ionic-compounds';
    case 'metal-one-oxidation-polyatomic':
    case 'metal-variable-oxidation-polyatomic':
      return 'polyatomic-ions';
    case 'nonmetal-nonmetal':
      return 'covalent-compounds';
    case 'hydrogen-halogen-binary-acids':
    case 'hydrogen-polyatomic-ternary-acids':
      return 'acids';
    default:
      return 'mixed-practice';
  }
}
