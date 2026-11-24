import extremeData from '@/data/questions/extreme.json';
import hotData from '@/data/questions/hot.json';
import mildData from '@/data/questions/mild.json';
import type { GameModeId } from '@/features/game-modes/registry';
import type { ContentTier } from '@/features/premium/entitlements';
import type { Locale, Question, SpicyLevel } from '@/types';

import { parseQuestions } from './parse';

export interface QuestionPack {
  id: string;
  modeId: GameModeId;
  level: SpicyLevel;
  tier: ContentTier;
  locale: Locale;
  questions: readonly Question[];
}

function buildPack(
  id: string,
  modeId: GameModeId,
  level: SpicyLevel,
  raw: unknown,
  tier: ContentTier = 'free',
  locale: Locale = 'de',
): QuestionPack {
  const { questions, issues } = parseQuestions(raw, level);
  if (issues.length > 0 && __DEV__) {
    console.warn(`[question-decks] ${id}: ${issues.length} invalid entries skipped`, issues);
  }
  return { id, modeId, level, tier, locale, questions };
}

/**
 * Built-in content. Future premium packs or other game modes are simply added
 * to this list (with `tier: 'premium'` where appropriate).
 */
export const BUILTIN_PACKS: readonly QuestionPack[] = [
  buildPack('spicy-questions.mild.base', 'spicy-questions', 'mild', mildData),
  buildPack('spicy-questions.hot.base', 'spicy-questions', 'hot', hotData),
  buildPack('spicy-questions.extreme.base', 'spicy-questions', 'extreme', extremeData),
];

/** Content is authored in German first; other locales fall back to it. */
export const CONTENT_FALLBACK_LOCALE: Locale = 'de';
