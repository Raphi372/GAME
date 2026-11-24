import { defaultRng, type Rng } from './random';

/** Collision-resistant local id (no network, no device identifiers). */
export function createId(prefix = 'id', rng: Rng = defaultRng): string {
  const time = Date.now().toString(36);
  const random = Math.floor(rng() * 0xffffffff)
    .toString(36)
    .padStart(7, '0');
  return `${prefix}_${time}${random}`;
}
