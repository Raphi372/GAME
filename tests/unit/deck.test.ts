import {
  countRemaining,
  drawQuestion,
  getRemainingQuestions,
  isDeckExhausted,
} from '@/features/gameplay/engine/deck';
import { createSeededRng } from '@/utils/random';

import { makeDeck } from '../helpers/fixtures';

describe('question deck', () => {
  const deck = makeDeck('mild', 12);

  it('draws a random question from the deck', () => {
    const rngA = createSeededRng(1);
    const rngB = createSeededRng(99);
    const first = drawQuestion(deck, [], rngA);
    const draws = new Set(
      Array.from({ length: 20 }, () => drawQuestion(deck, [], rngB)?.id),
    );
    expect(first).not.toBeNull();
    expect(deck).toContainEqual(first);
    // Random selection: repeated independent draws hit several different questions.
    expect(draws.size).toBeGreaterThan(3);
  });

  it('never returns a played question while unplayed ones remain', () => {
    const rng = createSeededRng(3);
    const played: string[] = [];
    for (let i = 0; i < deck.length; i += 1) {
      const question = drawQuestion(deck, played, rng);
      expect(question).not.toBeNull();
      expect(played).not.toContain(question?.id);
      played.push(question!.id);
    }
    expect(new Set(played).size).toBe(deck.length);
    expect(isDeckExhausted(deck, played)).toBe(true);
    expect(drawQuestion(deck, played, rng)).toBeNull();
  });

  it('counts remaining questions', () => {
    expect(countRemaining(deck, [])).toBe(12);
    expect(countRemaining(deck, ['mild_001', 'mild_002', 'unknown'])).toBe(10);
    expect(getRemainingQuestions(deck, ['mild_001']).map((q) => q.id)).not.toContain('mild_001');
  });

  it('handles an empty deck gracefully', () => {
    expect(drawQuestion([], [], createSeededRng(1))).toBeNull();
    expect(isDeckExhausted([], [])).toBe(true);
    expect(countRemaining([], [])).toBe(0);
  });

  it('prefers a different category than the previous question when possible', () => {
    const rng = createSeededRng(5);
    for (let i = 0; i < 30; i += 1) {
      expect(drawQuestion(deck, [], rng, { avoidCategory: 'flirty' })?.category).not.toBe('flirty');
    }
  });

  it('falls back to the same category when nothing else is left', () => {
    const onlyFlirty = deck.filter((q) => q.category === 'flirty');
    const result = drawQuestion(onlyFlirty, [], createSeededRng(1), { avoidCategory: 'flirty' });
    expect(result?.category).toBe('flirty');
  });
});
