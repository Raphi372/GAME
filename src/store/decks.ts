import { toQuestion } from '@/features/custom-cards/model';
import type { GameModeId } from '@/features/game-modes/registry';
import { canUseFeature } from '@/features/premium/entitlements';
import { getDeck } from '@/features/question-decks';
import type { Locale, Question, SpicyLevel } from '@/types';

import { useCustomCardsStore } from './customCardsStore';
import { useEntitlementsStore } from './entitlementsStore';
import { hiddenCardIds } from './hiddenCardsStore';

/** Leaves out the cards the group hid ("Karte ausblenden"). */
function withoutHidden<T extends Question>(questions: readonly T[]): readonly T[] {
  const hidden = hiddenCardIds();
  return hidden.size === 0 ? questions : questions.filter((question) => !hidden.has(question.id));
}

/** The players' own cards for a mode + level – only playable with Premium. */
export function getCustomQuestions(modeId: GameModeId, level: SpicyLevel): Question[] {
  const { entitlements } = useEntitlementsStore.getState();
  if (!canUseFeature('customQuestions', entitlements)) return [];
  return [
    ...withoutHidden(
      useCustomCardsStore
        .getState()
        .cards.filter((card) => card.modeId === modeId && card.level === level)
        .map(toQuestion),
    ),
  ];
}

/** Built-in cards of a mode + level that can still come up – without the hidden ones. */
export function getBuiltInDeck(modeId: GameModeId, level: SpicyLevel, locale: Locale): readonly Question[] {
  const { entitlements } = useEntitlementsStore.getState();
  return withoutHidden(getDeck(modeId, level, { locale, entitlements }));
}

/** Everything that can be drawn in a game: built-in cards plus the players' own cards. */
export function getPlayableDeck(modeId: GameModeId, level: SpicyLevel, locale: Locale): readonly Question[] {
  const builtIn = getBuiltInDeck(modeId, level, locale);
  const custom = getCustomQuestions(modeId, level);
  return custom.length > 0 ? [...builtIn, ...custom] : builtIn;
}
