import enMltExtreme from '@/data/questions/en/most-likely/extreme.json';
import enMltHot from '@/data/questions/en/most-likely/hot.json';
import enMltMild from '@/data/questions/en/most-likely/mild.json';
import enNhieExtreme from '@/data/questions/en/never-have-i-ever/extreme.json';
import enNhieHot from '@/data/questions/en/never-have-i-ever/hot.json';
import enNhieMild from '@/data/questions/en/never-have-i-ever/mild.json';
import enRcExtreme from '@/data/questions/en/random-challenges/extreme.json';
import enRcHot from '@/data/questions/en/random-challenges/hot.json';
import enRcMild from '@/data/questions/en/random-challenges/mild.json';
import enSqExtreme from '@/data/questions/en/spicy-questions/extreme.json';
import enSqHot from '@/data/questions/en/spicy-questions/hot.json';
import enSqMild from '@/data/questions/en/spicy-questions/mild.json';
import enTodExtreme from '@/data/questions/en/truth-or-dare/extreme.json';
import enTodHot from '@/data/questions/en/truth-or-dare/hot.json';
import enTodMild from '@/data/questions/en/truth-or-dare/mild.json';
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
 * A translation keeps ids, categories, kinds and timers of the German source pack and
 * only swaps the texts – so a running game survives a language switch. Cards without
 * a translation are left out (the validator and tests make sure none are missing).
 */
function translatePack(base: QuestionPack, locale: Locale, texts: Readonly<Record<string, string>>): QuestionPack {
  const questions = base.questions.flatMap((question) => {
    const text = texts[question.id];
    return typeof text === 'string' && text.trim().length > 0 ? [{ ...question, text }] : [];
  });
  if (questions.length !== base.questions.length && __DEV__) {
    console.warn(`[question-decks] ${base.id}: ${base.questions.length - questions.length} cards missing in ${locale}`);
  }
  return { ...base, id: `${base.id}.${locale}`, locale, questions };
}

/** German source content (the reference for every translation). */
const GERMAN_PACKS: readonly QuestionPack[] = [
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

/** English texts per German pack id. */
const ENGLISH_TEXTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'spicy-questions.mild.base': enSqMild,
  'spicy-questions.hot.base': enSqHot,
  'spicy-questions.extreme.base': enSqExtreme,
  'never-have-i-ever.mild.base': enNhieMild,
  'never-have-i-ever.hot.base': enNhieHot,
  'never-have-i-ever.extreme.base': enNhieExtreme,
  'most-likely.mild.base': enMltMild,
  'most-likely.hot.base': enMltHot,
  'most-likely.extreme.base': enMltExtreme,
  'truth-or-dare.mild.base': enTodMild,
  'truth-or-dare.hot.base': enTodHot,
  'truth-or-dare.extreme.base': enTodExtreme,
  'random-challenges.mild.base': enRcMild,
  'random-challenges.hot.base': enRcHot,
  'random-challenges.extreme.base': enRcExtreme,
};

/**
 * Built-in content in every shipped language. Future premium packs or other game modes
 * are simply added to the German list (with `tier: 'premium'` where appropriate).
 */
export const BUILTIN_PACKS: readonly QuestionPack[] = [
  ...GERMAN_PACKS,
  ...GERMAN_PACKS.flatMap((pack) => {
    const texts = ENGLISH_TEXTS[pack.id];
    return texts ? [translatePack(pack, 'en', texts)] : [];
  }),
];

/** Content is authored in German first; other locales fall back to it. */
export const CONTENT_FALLBACK_LOCALE: Locale = 'de';
