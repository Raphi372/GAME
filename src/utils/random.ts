/** A random source returning a float in [0, 1). */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/**
 * Small, fast deterministic PRNG (mulberry32).
 * Used in tests so that "random" behaviour is reproducible.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const value = Math.floor(rng() * maxExclusive);
  // Guard against rng implementations that may return exactly 1.
  return Math.min(value, maxExclusive - 1);
}

export function pickRandom<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(rng, items.length)];
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}
