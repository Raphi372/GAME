import type { Question, QuestionCategory } from '@/types';
import { pickRandom, type Rng } from '@/utils/random';

export interface DrawOptions {
  /** Prefer a question from a different category than this one (more variety). */
  avoidCategory?: QuestionCategory | null;
}

/** All questions of `deck` that have not been played yet. */
export function getRemainingQuestions(
  deck: readonly Question[],
  playedIds: readonly string[],
): Question[] {
  if (playedIds.length === 0) return [...deck];
  const played = new Set(playedIds);
  return deck.filter((question) => !played.has(question.id));
}

export function countRemaining(deck: readonly Question[], playedIds: readonly string[]): number {
  return getRemainingQuestions(deck, playedIds).length;
}

export function isDeckExhausted(deck: readonly Question[], playedIds: readonly string[]): boolean {
  return countRemaining(deck, playedIds) === 0;
}

/**
 * Draws a random, not yet played question.
 * Returns `null` if every question of the deck has been played (or the deck is empty).
 */
export function drawQuestion(
  deck: readonly Question[],
  playedIds: readonly string[],
  rng: Rng,
  options: DrawOptions = {},
): Question | null {
  const remaining = getRemainingQuestions(deck, playedIds);
  if (remaining.length === 0) return null;

  if (options.avoidCategory) {
    const varied = remaining.filter((question) => question.category !== options.avoidCategory);
    if (varied.length > 0) {
      return pickRandom(rng, varied) ?? null;
    }
  }
  return pickRandom(rng, remaining) ?? null;
}
