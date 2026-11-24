import { defaultRng, type Rng } from '@/utils/random';

let current: Rng = defaultRng;

/** Random source used by the game store. Tests can swap in a seeded RNG. */
export function getRng(): Rng {
  return current;
}

export function setRng(rng: Rng): void {
  current = rng;
}

export function resetRng(): void {
  current = defaultRng;
}
