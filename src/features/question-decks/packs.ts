import extremeData from '@/data/questions/extreme.json';
import hotData from '@/data/questions/hot.json';
import mildData from '@/data/questions/mild.json';
import mltExtremeData from '@/data/questions/most-likely/extreme.json';
import mltHotData from '@/data/questions/most-likely/hot.json';
import mltMildData from '@/data/questions/most-likely/mild.json';
import nhieExtremeData from '@/data/questions/never-have-i-ever/extreme.json';
import nhieHotData from '@/data/questions/never-have-i-ever/hot.json';
import nhieMildData from '@/data/questions/never-have-i-ever/mild.json';
import rcExtremeData from '@/data/questions/random-challenges/extreme.json';
import rcHotData from '@/data/questions/random-challenges/hot.json';
import rcMildData from '@/data/questions/random-challenges/mild.json';
import todExtremeData from '@/data/questions/truth-or-dare/extreme.json';
import todHotData from '@/data/questions/truth-or-dare/hot.json';
import todMildData from '@/data/questions/truth-or-dare/mild.json';
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
  buildPack('never-have-i-ever.mild.base', 'never-have-i-ever', 'mild', nhieMildData),
  buildPack('never-have-i-ever.hot.base', 'never-have-i-ever', 'hot', nhieHotData),
  buildPack('never-have-i-ever.extreme.base', 'never-have-i-ever', 'extreme', nhieExtremeData),
  buildPack('most-likely.mild.base', 'most-likely', 'mild', mltMildData),
  buildPack('most-likely.hot.base', 'most-likely', 'hot', mltHotData),
  buildPack('most-likely.extreme.base', 'most-likely', 'extreme', mltExtremeData),
  buildPack('truth-or-dare.mild.base', 'truth-or-dare', 'mild', todMildData),
  buildPack('truth-or-dare.hot.base', 'truth-or-dare', 'hot', todHotData),
  buildPack('truth-or-dare.extreme.base', 'truth-or-dare', 'extreme', todExtremeData),
  buildPack('random-challenges.mild.base', 'random-challenges', 'mild', rcMildData),
  buildPack('random-challenges.hot.base', 'random-challenges', 'hot', rcHotData),
  buildPack('random-challenges.extreme.base', 'random-challenges', 'extreme', rcExtremeData),
];

/** Content is authored in German first; other locales fall back to it. */
export const CONTENT_FALLBACK_LOCALE: Locale = 'de';
