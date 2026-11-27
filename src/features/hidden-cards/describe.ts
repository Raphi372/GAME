import { toQuestion, type CustomCard } from '@/features/custom-cards/model';
import { GAME_MODE_IDS, type GameModeId } from '@/features/game-modes/registry';
import { getDeck, renderQuestionText } from '@/features/question-decks';
import { SPICY_LEVELS, type CardKind, type Locale, type Question, type SpicyLevel } from '@/types';

export interface HiddenCard {
  id: string;
  modeId: GameModeId;
  level: SpicyLevel;
  /** Card text in the app language, a placeholder for another player filled in. */
  text: string;
  kind?: CardKind;
  /** One of the players' own cards. */
  own: boolean;
}

/** Every content pack – a card hidden while Premium was active is still listed without it. */
const ALL_PACKS = { premium: true };

/**
 * The hidden cards that still exist (built-in or own), newest first. Ids of cards that are
 * gone – e.g. a deleted own card – are left out; they can never come up anyway.
 */
export function describeHiddenCards(
  ids: readonly string[],
  locale: Locale,
  customCards: readonly CustomCard[],
  fallbackTargetName: string,
): HiddenCard[] {
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  const found = new Map<string, HiddenCard>();
  const add = (question: Question, modeId: GameModeId, own: boolean) =>
    found.set(question.id, {
      id: question.id,
      modeId,
      level: question.level,
      text: renderQuestionText(question.text, { fallbackTargetName }),
      ...(question.kind ? { kind: question.kind } : {}),
      own,
    });

  for (const modeId of GAME_MODE_IDS) {
    for (const level of SPICY_LEVELS) {
      for (const question of getDeck(modeId, level, { locale, entitlements: ALL_PACKS })) {
        if (wanted.has(question.id)) add(question, modeId, false);
      }
    }
  }
  for (const card of customCards) {
    if (wanted.has(card.id)) add(toQuestion(card), card.modeId, true);
  }
  return [...ids].reverse().flatMap((id) => found.get(id) ?? []);
}
