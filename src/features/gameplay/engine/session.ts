import type { GameModeId } from '@/features/game-modes/registry';
import { requiresTargetPlayer } from '@/features/question-decks/templates';
import { SPICY_LEVELS, type Player, type Question, type SpicyLevel } from '@/types';
import type { Rng } from '@/utils/random';

import { drawQuestion } from './deck';
import { initialTurnCount, pickNextPlayer, pickOtherPlayer, type TurnCounts } from './rotation';

export type TurnOutcome = 'answered' | 'passed' | 'skipped';

export interface PlayerStats {
  /** Spicy Questions: questions answered. */
  answered: number;
  /** Spicy Questions: turns passed ("Ich passe"). */
  passed: number;
  /** Cards skipped while this player was active. */
  skipped: number;
  /** "Ich hab noch nie": times the player admitted "hab ich schon". */
  confessed: number;
  /** "Wer würde am ehesten?": times the group picked this player. */
  picked: number;
}

/** The counter a group mode increments for the players marked on a card. */
export type GroupTally = 'confessed' | 'picked';

export interface CurrentTurn {
  playerId: string;
  /** `null` when every question of the current level has been played. */
  questionId: string | null;
  /** Player that replaces the `{other}` placeholder of the question. */
  targetPlayerId: string | null;
}

/**
 * A running game. Plain JSON (no Sets/Maps) so it can be persisted as is.
 */
export interface GameSession {
  id: string;
  modeId: GameModeId;
  level: SpicyLevel;
  startedAt: number;
  /** Question ids already shown in this session, per level. */
  playedByLevel: Record<SpicyLevel, string[]>;
  turnCounts: TurnCounts;
  lastPlayerId: string | null;
  current: CurrentTurn | null;
  /** Number of completed turns (answered or passed). */
  turnsCompleted: number;
  stats: Record<string, PlayerStats>;
}

export interface SessionContext {
  players: readonly Player[];
  getDeck: (level: SpicyLevel) => readonly Question[];
  rng: Rng;
}

export const emptyStats = (): PlayerStats => ({
  answered: 0,
  passed: 0,
  skipped: 0,
  confessed: 0,
  picked: 0,
});

/** Fills in counters missing in sessions persisted by older app versions. */
function normalizeStats(stats: Partial<PlayerStats> | undefined): PlayerStats {
  return { ...emptyStats(), ...stats };
}

function emptyPlayed(): Record<SpicyLevel, string[]> {
  return SPICY_LEVELS.reduce(
    (acc, level) => ({ ...acc, [level]: [] }),
    {} as Record<SpicyLevel, string[]>,
  );
}

function findQuestion(deck: readonly Question[], id: string | null): Question | undefined {
  if (!id) return undefined;
  return deck.find((question) => question.id === id);
}

/**
 * Draws a new question for `playerId` and marks it as played immediately so it can
 * never appear twice – even when it gets skipped.
 */
function dealTurn(session: GameSession, playerId: string, ctx: SessionContext): GameSession {
  const deck = ctx.getDeck(session.level);
  const played = session.playedByLevel[session.level];
  const previous = findQuestion(deck, session.current?.questionId ?? null);
  const question = drawQuestion(deck, played, ctx.rng, {
    avoidCategory: previous?.category ?? null,
  });

  const playerIds = ctx.players.map((player) => player.id);
  const targetPlayerId =
    question && requiresTargetPlayer(question.text)
      ? pickOtherPlayer(playerIds, playerId, ctx.rng)
      : null;

  return {
    ...session,
    playedByLevel: question
      ? { ...session.playedByLevel, [session.level]: [...played, question.id] }
      : session.playedByLevel,
    current: { playerId, questionId: question?.id ?? null, targetPlayerId },
  };
}

export interface CreateSessionOptions {
  id: string;
  modeId: GameModeId;
  level: SpicyLevel;
  now: number;
}

export function createSession(options: CreateSessionOptions, ctx: SessionContext): GameSession {
  const turnCounts: TurnCounts = {};
  const stats: Record<string, PlayerStats> = {};
  for (const player of ctx.players) {
    turnCounts[player.id] = 0;
    stats[player.id] = emptyStats();
  }

  const base: GameSession = {
    id: options.id,
    modeId: options.modeId,
    level: options.level,
    startedAt: options.now,
    playedByLevel: emptyPlayed(),
    turnCounts,
    lastPlayerId: null,
    current: null,
    turnsCompleted: 0,
    stats,
  };

  const firstPlayer = pickNextPlayer(
    ctx.players.map((player) => player.id),
    turnCounts,
    null,
    ctx.rng,
  );
  return firstPlayer ? dealTurn(base, firstPlayer, ctx) : base;
}

function bumpStat(
  stats: Record<string, PlayerStats>,
  playerId: string,
  key: keyof PlayerStats,
): Record<string, PlayerStats> {
  const current = normalizeStats(stats[playerId]);
  return { ...stats, [playerId]: { ...current, [key]: current[key] + 1 } };
}

/** Ends the active player's turn and deals the next card to the next player. */
function advanceTurn(session: GameSession, ctx: SessionContext): GameSession {
  const current = session.current;
  if (!current) return session;
  const turnCounts = {
    ...session.turnCounts,
    [current.playerId]: (session.turnCounts[current.playerId] ?? 0) + 1,
  };
  const updated: GameSession = {
    ...session,
    turnCounts,
    lastPlayerId: current.playerId,
    turnsCompleted: session.turnsCompleted + 1,
  };
  const nextPlayer = pickNextPlayer(
    ctx.players.map((player) => player.id),
    turnCounts,
    current.playerId,
    ctx.rng,
  );
  if (!nextPlayer) return { ...updated, current: null };
  return dealTurn(updated, nextPlayer, ctx);
}

/**
 * Finishes the current turn ("answered" = NÄCHSTE FRAGE, "passed" = ICH PASSE)
 * and automatically starts the next round with the next player.
 */
export function completeTurn(
  session: GameSession,
  outcome: Exclude<TurnOutcome, 'skipped'>,
  ctx: SessionContext,
): GameSession {
  const current = session.current;
  if (!current) return session;
  return advanceTurn({ ...session, stats: bumpStat(session.stats, current.playerId, outcome) }, ctx);
}

/**
 * Group modes: every marked player gets the mode's counter increased (e.g. a
 * confession in "Ich hab noch nie", a pick in "Wer würde am ehesten?"). Marking is
 * voluntary – the list may be empty. Then the next player reads the next card.
 */
export function completeGroupRound(
  session: GameSession,
  markedPlayerIds: readonly string[],
  ctx: SessionContext,
  tally: GroupTally = 'confessed',
): GameSession {
  if (!session.current) return session;
  const valid = new Set(ctx.players.map((player) => player.id));
  let stats = session.stats;
  for (const id of new Set(markedPlayerIds)) {
    if (valid.has(id)) stats = bumpStat(stats, id, tally);
  }
  return advanceTurn({ ...session, stats }, ctx);
}

/** ÜBERSPRINGEN: same player, new question. The skipped question is not shown again. */
export function skipQuestion(session: GameSession, ctx: SessionContext): GameSession {
  const current = session.current;
  if (!current || current.questionId === null) return session;
  const updated = { ...session, stats: bumpStat(session.stats, current.playerId, 'skipped') };
  return dealTurn(updated, current.playerId, ctx);
}

/** Switches the spicy level between rounds. The current player keeps their turn. */
export function changeLevel(
  session: GameSession,
  level: SpicyLevel,
  ctx: SessionContext,
): GameSession {
  if (session.level === level) return session;
  const updated: GameSession = { ...session, level };
  const playerId = session.current?.playerId ?? pickFallbackPlayer(updated, ctx);
  if (!playerId) return { ...updated, current: null };
  // Do not use the old level's category for variety; it belongs to another deck.
  return dealTurn({ ...updated, current: null }, playerId, ctx);
}

/** Resets the played questions of the current level and deals a fresh question. */
export function reshuffleLevel(session: GameSession, ctx: SessionContext): GameSession {
  const updated: GameSession = {
    ...session,
    playedByLevel: { ...session.playedByLevel, [session.level]: [] },
  };
  const playerId = session.current?.playerId ?? pickFallbackPlayer(updated, ctx);
  if (!playerId) return { ...updated, current: null };
  return dealTurn(updated, playerId, ctx);
}

function pickFallbackPlayer(session: GameSession, ctx: SessionContext): string | null {
  return pickNextPlayer(
    ctx.players.map((player) => player.id),
    session.turnCounts,
    session.lastPlayerId,
    ctx.rng,
  );
}

/**
 * Keeps the session consistent after players were added, renamed or removed
 * during a running game.
 */
export function syncSessionPlayers(session: GameSession, ctx: SessionContext): GameSession {
  const ids = ctx.players.map((player) => player.id);
  const idSet = new Set(ids);
  const existingIds = Object.keys(session.turnCounts).filter((id) => idSet.has(id));

  const turnCounts: TurnCounts = {};
  const stats: Record<string, PlayerStats> = {};
  const startCount = initialTurnCount(session.turnCounts, existingIds);
  for (const id of ids) {
    turnCounts[id] = session.turnCounts[id] ?? startCount;
    stats[id] = normalizeStats(session.stats[id]);
  }

  let updated: GameSession = {
    ...session,
    turnCounts,
    stats,
    lastPlayerId: session.lastPlayerId && idSet.has(session.lastPlayerId) ? session.lastPlayerId : null,
  };

  const current = session.current;
  if (!current) {
    const playerId = pickFallbackPlayer(updated, ctx);
    return playerId ? dealTurn(updated, playerId, ctx) : updated;
  }

  if (!idSet.has(current.playerId)) {
    // The active player left: hand the *same* question to the next player.
    const nextPlayer = pickFallbackPlayer(updated, ctx);
    if (!nextPlayer) return { ...updated, current: null };
    updated = { ...updated, current: { ...current, playerId: nextPlayer } };
  }

  const active = updated.current;
  if (active && active.targetPlayerId !== null) {
    const targetValid =
      idSet.has(active.targetPlayerId) && active.targetPlayerId !== active.playerId;
    if (!targetValid) {
      updated = {
        ...updated,
        current: { ...active, targetPlayerId: pickOtherPlayer(ids, active.playerId, ctx.rng) },
      };
    }
  }
  return updated;
}

/**
 * Repairs a persisted session (e.g. after an app update changed the question
 * database): drops unknown ids and deals a new question if necessary.
 */
export function repairSession(session: GameSession, ctx: SessionContext): GameSession {
  const playedByLevel = emptyPlayed();
  for (const level of SPICY_LEVELS) {
    const known = new Set(ctx.getDeck(level).map((question) => question.id));
    playedByLevel[level] = (session.playedByLevel?.[level] ?? []).filter((id) => known.has(id));
  }
  let repaired = syncSessionPlayers({ ...session, playedByLevel }, ctx);

  const current = repaired.current;
  const deck = ctx.getDeck(repaired.level);
  if (current && current.questionId !== null && !findQuestion(deck, current.questionId)) {
    repaired = dealTurn({ ...repaired, current: null }, current.playerId, ctx);
  }
  return repaired;
}

export function getCurrentQuestion(
  session: GameSession,
  getDeck: SessionContext['getDeck'],
): Question | null {
  return findQuestion(getDeck(session.level), session.current?.questionId ?? null) ?? null;
}
