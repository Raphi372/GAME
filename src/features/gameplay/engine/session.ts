import type { GameModeId } from '@/features/game-modes/registry';
import { requiresTargetPlayer } from '@/features/question-decks/templates';
import { SPICY_LEVELS, type CardKind, type Player, type Question, type SpicyLevel } from '@/types';
import type { Rng } from '@/utils/random';

import { drawQuestion, getRemainingQuestions } from './deck';
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
  /** "Wahrheit oder Pflicht": truths answered. */
  truths: number;
  /** "Wahrheit oder Pflicht": dares done. */
  dares: number;
}

/** The counter a group mode increments for the players marked on a card. */
export type GroupTally = 'confessed' | 'picked';

export interface CurrentTurn {
  playerId: string;
  /**
   * `null` when every question of the current level has been played – or, in
   * choice modes, while the player is still choosing (then `kind` is null too).
   */
  questionId: string | null;
  /** Player that replaces the `{other}` placeholder of the question. */
  targetPlayerId: string | null;
  /** Choice modes: the kind the player picked ("truth"/"dare"); null while choosing. */
  kind?: CardKind | null;
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
  /**
   * Choice modes ("Wahrheit oder Pflicht"): the player first picks one of these
   * kinds, then a card of that kind is drawn. Omitted for all other modes.
   */
  choiceKinds?: readonly CardKind[];
}

export const emptyStats = (): PlayerStats => ({
  answered: 0,
  passed: 0,
  skipped: 0,
  confessed: 0,
  picked: 0,
  truths: 0,
  dares: 0,
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

/** Draws a card (optionally of one kind) for `playerId`; null if none is left. */
function drawCard(
  session: GameSession,
  playerId: string,
  ctx: SessionContext,
  kind: CardKind | null,
): GameSession | null {
  const fullDeck = ctx.getDeck(session.level);
  const deck = kind ? fullDeck.filter((question) => question.kind === kind) : fullDeck;
  const played = session.playedByLevel[session.level];
  const previous = findQuestion(fullDeck, session.current?.questionId ?? null);
  const question = drawQuestion(deck, played, ctx.rng, {
    avoidCategory: previous?.category ?? null,
  });
  if (!question) return null;

  const playerIds = ctx.players.map((player) => player.id);
  const targetPlayerId = requiresTargetPlayer(question.text)
    ? pickOtherPlayer(playerIds, playerId, ctx.rng)
    : null;

  return {
    ...session,
    playedByLevel: { ...session.playedByLevel, [session.level]: [...played, question.id] },
    current: { playerId, questionId: question.id, targetPlayerId, kind },
  };
}

/**
 * Starts the turn of `playerId`. Usually a new question is drawn and marked as
 * played immediately so it can never appear twice – even when it gets skipped.
 * In choice modes the player first has to pick a kind (see `chooseCard`).
 */
function dealTurn(session: GameSession, playerId: string, ctx: SessionContext): GameSession {
  if (ctx.choiceKinds && ctx.choiceKinds.length > 0) {
    return {
      ...session,
      current: { playerId, questionId: null, targetPlayerId: null, kind: null },
    };
  }
  return (
    drawCard(session, playerId, ctx, null) ?? {
      ...session,
      current: { playerId, questionId: null, targetPlayerId: null },
    }
  );
}

/** True while the active player of a choice mode still has to pick a kind. */
export function isAwaitingChoice(session: GameSession, ctx: Pick<SessionContext, 'choiceKinds'>): boolean {
  const current = session.current;
  return Boolean(
    ctx.choiceKinds?.length && current && current.questionId === null && !current.kind,
  );
}

/** Unplayed cards per kind in the current level (for the choice buttons). */
export function remainingByKind(
  session: GameSession,
  getDeck: SessionContext['getDeck'],
  kinds: readonly CardKind[],
): Record<CardKind, number> {
  const remaining = getRemainingQuestions(getDeck(session.level), session.playedByLevel[session.level]);
  const counts = { truth: 0, dare: 0 } as Record<CardKind, number>;
  for (const kind of kinds) counts[kind] = remaining.filter((question) => question.kind === kind).length;
  return counts;
}

/**
 * Choice modes: the active player picks "truth" or "dare" and gets a card of that
 * kind. Does nothing if the player already has a card or no card of that kind is left.
 */
export function chooseCard(session: GameSession, kind: CardKind, ctx: SessionContext): GameSession {
  const current = session.current;
  if (!current || !isAwaitingChoice(session, ctx) || !ctx.choiceKinds?.includes(kind)) {
    return session;
  }
  return drawCard(session, current.playerId, ctx, kind) ?? session;
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
  let stats = bumpStat(session.stats, current.playerId, outcome);
  // Choice modes also count which kind was done.
  if (outcome === 'answered' && current.kind && current.questionId) {
    stats = bumpStat(stats, current.playerId, current.kind === 'truth' ? 'truths' : 'dares');
  }
  return advanceTurn({ ...session, stats }, ctx);
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

/**
 * ÜBERSPRINGEN: same player, new question. The skipped question is not shown again.
 * In choice modes the new card has the same kind; if none is left, the player
 * chooses again.
 */
export function skipQuestion(session: GameSession, ctx: SessionContext): GameSession {
  const current = session.current;
  if (!current || current.questionId === null) return session;
  const updated = { ...session, stats: bumpStat(session.stats, current.playerId, 'skipped') };
  if (current.kind) {
    return (
      drawCard(updated, current.playerId, ctx, current.kind) ?? {
        ...updated,
        current: { playerId: current.playerId, questionId: null, targetPlayerId: null, kind: null },
      }
    );
  }
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
