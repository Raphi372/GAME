import type { SessionContext } from '@/features/gameplay/engine/session';
import type { Player, Question, QuestionCategory, SpicyLevel } from '@/types';
import { createSeededRng, type Rng } from '@/utils/random';

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    colorIndex: index,
  }));
}

const CATEGORIES: QuestionCategory[] = ['flirty', 'dating', 'funny', 'group'];

export function makeDeck(level: SpicyLevel, size: number, withPlaceholderEvery = 0): Question[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `${level}_${String(index + 1).padStart(3, '0')}`,
    level,
    category: CATEGORIES[index % CATEGORIES.length] as QuestionCategory,
    text:
      withPlaceholderEvery > 0 && index % withPlaceholderEvery === 0
        ? `Frage ${index + 1} über {other}?`
        : `Frage ${level} Nummer ${index + 1}?`,
  }));
}

export function makeContext(
  players: Player[],
  sizes: Partial<Record<SpicyLevel, number>> = {},
  rng: Rng = createSeededRng(42),
): SessionContext {
  const decks: Record<SpicyLevel, Question[]> = {
    mild: makeDeck('mild', sizes.mild ?? 10),
    hot: makeDeck('hot', sizes.hot ?? 10),
    extreme: makeDeck('extreme', sizes.extreme ?? 10),
  };
  return { players, rng, getDeck: (level) => decks[level] };
}
