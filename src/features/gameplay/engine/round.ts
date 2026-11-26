import type { GameModeId } from '@/features/game-modes/registry';
import { SPICY_LEVELS, type SpicyLevel } from '@/types';
import type { Rng } from '@/utils/random';

/** Round lengths offered before the game; `null` plays until the group stops. */
export const ROUND_LENGTHS = [10, 20, 30] as const;
export const MIN_ROUND_LENGTH = 1;
export const MAX_ROUND_LENGTH = 100;

/**
 * How a round is played – chosen before the game ("Runde anpassen").
 * A plain object (no classes) so it can be persisted with the session.
 */
export interface RoundSettings {
  /** Cards (completed turns) in this round; `null` = endless. */
  length: number | null;
  /** Modes the cards come from. More than one = a mixed round. */
  modeIds: GameModeId[];
  /** Escalating round: starts MILD and heats up to `peak` over the round. */
  escalate: boolean;
  /** Highest level of the round – the level chosen on the level screen. */
  peak: SpicyLevel;
}

export function defaultRound(modeId: GameModeId, level: SpicyLevel): RoundSettings {
  return { length: null, modeIds: [modeId], escalate: false, peak: level };
}

export function isMixedRound(round: RoundSettings): boolean {
  return round.modeIds.length > 1;
}

/** Escalation only works with a fixed length and a goal above MILD. */
export function canEscalate(length: number | null, peak: SpicyLevel): boolean {
  return length !== null && SPICY_LEVELS.indexOf(peak) > 0;
}

/**
 * Level of the card with index `turnIndex` (0 = first card) in an escalating round:
 * the round is split evenly into MILD → … → `peak`. `null` when the round does not
 * escalate.
 */
export function levelForTurn(round: RoundSettings, turnIndex: number): SpicyLevel | null {
  if (!round.escalate || round.length === null || !canEscalate(round.length, round.peak)) return null;
  const steps = SPICY_LEVELS.slice(0, SPICY_LEVELS.indexOf(round.peak) + 1);
  const index = Math.floor((Math.max(0, turnIndex) * steps.length) / round.length);
  return steps[Math.min(steps.length - 1, index)] ?? null;
}

/** True when the card at `turnIndex` is the first one of a new, higher level. */
export function isLevelUp(round: RoundSettings, turnIndex: number): boolean {
  if (turnIndex <= 0) return false;
  const level = levelForTurn(round, turnIndex);
  return level !== null && level !== levelForTurn(round, turnIndex - 1);
}

export function isRoundOver(round: RoundSettings, turnsCompleted: number): boolean {
  return round.length !== null && turnsCompleted >= round.length;
}

/**
 * Order in which a mixed round tries its modes for the next card: modes dealt least
 * often come first (so every mode gets its turn), ties in random order, and the mode
 * of the previous card goes last – never the same mode twice in a row if avoidable.
 */
export function modeOrder(
  candidates: readonly GameModeId[],
  dealt: Partial<Record<GameModeId, number>>,
  previous: GameModeId | null,
  rng: Rng,
): GameModeId[] {
  const keyed = candidates.map((modeId) => ({
    modeId,
    count: dealt[modeId] ?? 0,
    last: modeId === previous ? 1 : 0,
    tie: rng(),
  }));
  keyed.sort((a, b) => a.last - b.last || a.count - b.count || a.tie - b.tie);
  return keyed.map((entry) => entry.modeId);
}
