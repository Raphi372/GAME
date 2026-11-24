import { pickRandom, type Rng } from '@/utils/random';

/** How many turns each player (by id) has had in the current session. */
export type TurnCounts = Record<string, number>;

/**
 * Picks the next player.
 *
 * Rules (fair random rotation):
 * 1. The player who just had a turn is never picked again directly (if ≥ 2 players).
 * 2. Only players with the lowest number of turns are eligible, so everybody gets
 *    the same amount of turns in the long run (difference is at most 1).
 * 3. Among the eligible players the choice is random.
 */
export function pickNextPlayer(
  playerIds: readonly string[],
  counts: TurnCounts,
  lastPlayerId: string | null,
  rng: Rng,
): string | null {
  if (playerIds.length === 0) return null;
  if (playerIds.length === 1) return playerIds[0] ?? null;

  const candidates = playerIds.filter((id) => id !== lastPlayerId);
  const minTurns = Math.min(...candidates.map((id) => counts[id] ?? 0));
  const eligible = candidates.filter((id) => (counts[id] ?? 0) === minTurns);
  return pickRandom(rng, eligible) ?? null;
}

/**
 * Turn count for a player who joins a running game. They start at the current
 * minimum so they are integrated fairly instead of being picked many times in a row.
 */
export function initialTurnCount(counts: TurnCounts, existingPlayerIds: readonly string[]): number {
  if (existingPlayerIds.length === 0) return 0;
  return Math.min(...existingPlayerIds.map((id) => counts[id] ?? 0));
}

/** Picks a random player other than `excludeId` (used for `{other}` placeholders). */
export function pickOtherPlayer(
  playerIds: readonly string[],
  excludeId: string,
  rng: Rng,
): string | null {
  const others = playerIds.filter((id) => id !== excludeId);
  return pickRandom(rng, others) ?? null;
}
