export const SPICY_LEVELS = ['mild', 'hot', 'extreme'] as const;
export type SpicyLevel = (typeof SPICY_LEVELS)[number];

export const QUESTION_CATEGORIES = [
  'flirty',
  'dating',
  'confession',
  'group',
  'personal',
  'funny',
  'romance',
  'desire',
  'secrets',
  'hypothetical',
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

/** Card kinds for modes where the player chooses (Wahrheit oder Pflicht). */
export const CARD_KINDS = ['truth', 'dare'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** Optional intensity within a level: 1 = soft, 3 = bold. */
export type QuestionIntensity = 1 | 2 | 3;

export interface Question {
  id: string;
  level: SpicyLevel;
  category: QuestionCategory;
  /**
   * Question text. May contain the placeholder `{other}` which is replaced
   * with the name of another (random) player at runtime.
   */
  text: string;
  intensity?: QuestionIntensity;
  /** Only in choice modes: "truth" (a question) or "dare" (a task). */
  kind?: CardKind;
}

export interface Player {
  id: string;
  name: string;
  /** Index into the avatar colour palette. */
  colorIndex: number;
}

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export function isSpicyLevel(value: unknown): value is SpicyLevel {
  return typeof value === 'string' && (SPICY_LEVELS as readonly string[]).includes(value);
}

export function isQuestionCategory(value: unknown): value is QuestionCategory {
  return typeof value === 'string' && (QUESTION_CATEGORIES as readonly string[]).includes(value);
}

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === 'string' && (CARD_KINDS as readonly string[]).includes(value);
}
