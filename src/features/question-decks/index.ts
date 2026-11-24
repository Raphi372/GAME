import type { GameModeId } from '@/features/game-modes/registry';
import { canAccessTier, FREE_ENTITLEMENTS, type Entitlements } from '@/features/premium/entitlements';
import type { Locale, Question, SpicyLevel } from '@/types';

import { BUILTIN_PACKS, CONTENT_FALLBACK_LOCALE, type QuestionPack } from './packs';

export { renderQuestionText, requiresTargetPlayer } from './templates';
export type { QuestionPack } from './packs';

export interface DeckOptions {
  locale?: Locale;
  entitlements?: Entitlements;
  packs?: readonly QuestionPack[];
}

const cache = new Map<string, readonly Question[]>();

function selectLocale(packs: readonly QuestionPack[], locale: Locale): Locale {
  return packs.some((pack) => pack.locale === locale) ? locale : CONTENT_FALLBACK_LOCALE;
}

/**
 * Returns every question the user may play for a mode + level.
 * Results are cached because the decks are static.
 */
export function getDeck(
  modeId: GameModeId,
  level: SpicyLevel,
  options: DeckOptions = {},
): readonly Question[] {
  const entitlements = options.entitlements ?? FREE_ENTITLEMENTS;
  const packs = (options.packs ?? BUILTIN_PACKS).filter(
    (pack) => pack.modeId === modeId && pack.level === level,
  );
  const locale = selectLocale(packs, options.locale ?? CONTENT_FALLBACK_LOCALE);
  const key = `${modeId}|${level}|${locale}|${entitlements.premium ? 'p' : 'f'}`;

  if (!options.packs) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const questions = packs
    .filter((pack) => pack.locale === locale && canAccessTier(pack.tier, entitlements))
    .flatMap((pack) => pack.questions);

  if (!options.packs) cache.set(key, questions);
  return questions;
}

/** True if question content exists in the requested locale (not only via fallback). */
export function hasContentInLocale(locale: Locale): boolean {
  return BUILTIN_PACKS.some((pack) => pack.locale === locale);
}

export function getDeckSize(modeId: GameModeId, level: SpicyLevel, options?: DeckOptions): number {
  return getDeck(modeId, level, options).length;
}
