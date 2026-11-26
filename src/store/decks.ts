import { toQuestion } from '@/features/custom-cards/model';
import type { GameModeId } from '@/features/game-modes/registry';
import { canUseFeature } from '@/features/premium/entitlements';
import { getDeck } from '@/features/question-decks';
import type { Locale, Question, SpicyLevel } from '@/types';

import { useCustomCardsStore } from './customCardsStore';
import { useEntitlementsStore } from './entitlementsStore';

/** The players' own cards for a mode + level – only playable with Premium. */
export function getCustomQuestions(modeId: GameModeId, level: SpicyLevel): Question[] {
  const { entitlements } = useEntitlementsStore.getState();
  if (!canUseFeature('customQuestions', entitlements)) return [];
  return useCustomCardsStore
    .getState()
    .cards.filter((card) => card.modeId === modeId && card.level === level)
    .map(toQuestion);
}

/** Everything that can be drawn in a game: built-in cards plus the players' own cards. */
export function getPlayableDeck(modeId: GameModeId, level: SpicyLevel, locale: Locale): readonly Question[] {
  const { entitlements } = useEntitlementsStore.getState();
  const builtIn = getDeck(modeId, level, { locale, entitlements });
  const custom = getCustomQuestions(modeId, level);
  return custom.length > 0 ? [...builtIn, ...custom] : builtIn;
}
