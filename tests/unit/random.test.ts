import { createSeededRng, pickRandom, randomInt, shuffle } from '@/utils/random';

describe('random utilities', () => {
  it('produces reproducible sequences for the same seed', () => {
    const a = createSeededRng(7);
    const b = createSeededRng(7);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
    seqA.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it('randomInt stays within bounds even if the rng returns 1', () => {
    expect(randomInt(() => 0.9999999, 5)).toBe(4);
    expect(randomInt(() => 1, 5)).toBe(4);
    expect(randomInt(() => 0.5, 0)).toBe(0);
  });

  it('pickRandom returns undefined for empty arrays', () => {
    expect(pickRandom(Math.random, [])).toBeUndefined();
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const result = shuffle(createSeededRng(1), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...result].sort()).toEqual(input);
  });
});
