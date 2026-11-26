import type { GameModeId } from '@/features/game-modes/registry';
import {
  canEscalate,
  defaultRound,
  isLevelUp,
  levelForTurn,
  modeOrder,
  type RoundSettings,
} from '@/features/gameplay/engine/round';
import {
  changeLevel,
  chooseCard,
  completeGroupRound,
  completeTurn,
  createSession,
  getCurrentQuestion,
  isAwaitingChoice,
  isSessionOver,
  normalizeRound,
  repairSession,
  roundProgress,
  skipQuestion,
  syncSessionPlayers,
  type GameSession,
  type SessionContext,
} from '@/features/gameplay/engine/session';
import type { CardKind, Player, Question, SpicyLevel } from '@/types';
import { DEFAULT_LAST_ROUND, sanitizeGameData, sessionMinPlayers, useGameStore } from '@/store/gameStore';
import { createSeededRng } from '@/utils/random';

import { makeContext, makePlayers } from '../helpers/fixtures';
import { addPlayers, resetStores } from '../helpers/stores';

const base = { id: 's1', modeId: 'spicy-questions' as const, level: 'mild' as const, now: 1000 };

function round(overrides: Partial<RoundSettings>): RoundSettings {
  return { ...defaultRound('spicy-questions', 'extreme'), ...overrides };
}

describe('round settings', () => {
  it('escalates evenly from MILD up to the chosen level', () => {
    const toExtreme = round({ length: 10, escalate: true, peak: 'extreme' });
    const levels = Array.from({ length: 10 }, (_, index) => levelForTurn(toExtreme, index));
    expect(levels).toEqual(['mild', 'mild', 'mild', 'mild', 'hot', 'hot', 'hot', 'extreme', 'extreme', 'extreme']);

    const toHot = round({ length: 20, escalate: true, peak: 'hot' });
    const hotLevels = Array.from({ length: 20 }, (_, index) => levelForTurn(toHot, index));
    expect(hotLevels.filter((level) => level === 'mild')).toHaveLength(10);
    expect(hotLevels.filter((level) => level === 'hot')).toHaveLength(10);
    expect(hotLevels).not.toContain('extreme');
  });

  it('only escalates with a fixed length and a goal above MILD', () => {
    expect(canEscalate(null, 'extreme')).toBe(false);
    expect(canEscalate(10, 'mild')).toBe(false);
    expect(canEscalate(10, 'hot')).toBe(true);
    expect(levelForTurn(round({ length: null, escalate: true }), 3)).toBeNull();
    expect(levelForTurn(round({ length: 10, escalate: false }), 3)).toBeNull();
    expect(levelForTurn(round({ length: 10, escalate: true, peak: 'mild' }), 3)).toBeNull();
  });

  it('marks the first card of each new level', () => {
    const toExtreme = round({ length: 10, escalate: true, peak: 'extreme' });
    const ups = Array.from({ length: 10 }, (_, index) => index).filter((index) => isLevelUp(toExtreme, index));
    expect(ups).toEqual([4, 7]);
  });

  it('clamps stored settings to something playable', () => {
    expect(normalizeRound({ length: 0 }, 'spicy-questions', 'hot').length).toBe(1);
    expect(normalizeRound({ length: 5000 }, 'spicy-questions', 'hot').length).toBe(100);
    expect(normalizeRound({ length: 2.5 }, 'spicy-questions', 'hot').length).toBeNull();
    expect(normalizeRound({ length: null, escalate: true }, 'spicy-questions', 'hot').escalate).toBe(false);
    expect(normalizeRound({ modeIds: ['most-likely'] }, 'spicy-questions', 'hot').modeIds).toEqual([
      'spicy-questions',
      'most-likely',
    ]);
    expect(normalizeRound(undefined, 'truth-or-dare', 'mild')).toEqual(defaultRound('truth-or-dare', 'mild'));
  });

  it('mixes modes evenly and never repeats the previous mode if avoidable', () => {
    const rng = createSeededRng(7);
    const modes: GameModeId[] = ['spicy-questions', 'truth-or-dare', 'never-have-i-ever'];
    expect(modeOrder(modes, { 'spicy-questions': 2, 'truth-or-dare': 0, 'never-have-i-ever': 1 }, null, rng)).toEqual([
      'truth-or-dare',
      'never-have-i-ever',
      'spicy-questions',
    ]);
    expect(modeOrder(modes, {}, 'truth-or-dare', rng).at(-1)).toBe('truth-or-dare');
    expect(modeOrder(['truth-or-dare'], {}, 'truth-or-dare', rng)).toEqual(['truth-or-dare']);
  });
});

describe('rounds with a fixed length', () => {
  it('ends after the last card and counts the cards', () => {
    const ctx = makeContext(makePlayers(3), { mild: 20 });
    let session = createSession({ ...base, round: { length: 3 } }, ctx);
    expect(roundProgress(session)).toEqual({ current: 1, total: 3 });
    session = completeTurn(session, 'answered', ctx);
    session = completeTurn(session, 'passed', ctx);
    expect(roundProgress(session)).toEqual({ current: 3, total: 3 });
    expect(isSessionOver(session)).toBe(false);
    session = completeTurn(session, 'answered', ctx);
    expect(isSessionOver(session)).toBe(true);
    expect(session.current).toBeNull();
    expect(session.turnsCompleted).toBe(3);
  });

  it('does not count skipped cards', () => {
    const ctx = makeContext(makePlayers(2), { mild: 20 });
    let session = createSession({ ...base, round: { length: 2 } }, ctx);
    session = skipQuestion(session, ctx);
    session = skipQuestion(session, ctx);
    session = completeTurn(session, 'answered', ctx);
    expect(isSessionOver(session)).toBe(false);
    expect(roundProgress(session)).toEqual({ current: 2, total: 2 });
  });

  it('counts group cards as well', () => {
    const ctx = makeContext(makePlayers(3), { mild: 20 });
    let session = createSession({ ...base, modeId: 'never-have-i-ever', round: { length: 2 } }, ctx);
    session = completeGroupRound(session, ['p1'], ctx);
    session = completeGroupRound(session, [], ctx);
    expect(isSessionOver(session)).toBe(true);
  });

  it('stays over when players change afterwards', () => {
    const ctx = makeContext(makePlayers(3), { mild: 20 });
    let session = createSession({ ...base, round: { length: 1 } }, ctx);
    session = completeTurn(session, 'answered', ctx);
    const synced = syncSessionPlayers(session, { ...ctx, players: makePlayers(4) });
    expect(synced.current).toBeNull();
    expect(isSessionOver(synced)).toBe(true);
  });

  it('endless rounds have no progress and never end on their own', () => {
    const ctx = makeContext(makePlayers(2), { mild: 50 });
    let session = createSession(base, ctx);
    for (let i = 0; i < 40; i += 1) session = completeTurn(session, 'answered', ctx);
    expect(roundProgress(session)).toBeNull();
    expect(isSessionOver(session)).toBe(false);
    expect(session.current?.questionId).toBeTruthy();
  });
});

describe('escalating rounds', () => {
  it('starts MILD and climbs to the chosen level', () => {
    const ctx = makeContext(makePlayers(3), { mild: 20, hot: 20, extreme: 20 });
    let session = createSession({ ...base, level: 'extreme', round: { length: 10, escalate: true } }, ctx);
    const levels: SpicyLevel[] = [session.level];
    expect(getCurrentQuestion(session, ctx.getDeck)?.level).toBe('mild');
    for (let i = 0; i < 9; i += 1) {
      session = completeTurn(session, 'answered', ctx);
      levels.push(session.level);
      expect(getCurrentQuestion(session, ctx.getDeck)?.level).toBe(session.level);
    }
    expect(levels).toEqual(['mild', 'mild', 'mild', 'mild', 'hot', 'hot', 'hot', 'extreme', 'extreme', 'extreme']);
    expect(session.round.peak).toBe('extreme');
  });

  it('a level picked by hand ends the escalation', () => {
    const ctx = makeContext(makePlayers(3), { mild: 20, hot: 20, extreme: 20 });
    let session = createSession({ ...base, level: 'extreme', round: { length: 10, escalate: true } }, ctx);
    session = changeLevel(session, 'hot', ctx);
    expect(session.round.escalate).toBe(false);
    for (let i = 0; i < 6; i += 1) session = completeTurn(session, 'answered', ctx);
    expect(session.level).toBe('hot');
  });

  it('ignores escalation without a round length', () => {
    const ctx = makeContext(makePlayers(2));
    const session = createSession({ ...base, level: 'hot', round: { length: null, escalate: true } }, ctx);
    expect(session.round.escalate).toBe(false);
    expect(session.level).toBe('hot');
  });
});

/** Decks per mode: ids start with the mode so every card is traceable. */
function makeMixedContext(players: Player[], size = 12, rng = createSeededRng(3)): SessionContext {
  const deckFor = (modeId: GameModeId, level: SpicyLevel): Question[] =>
    Array.from({ length: size }, (_, index) => ({
      id: `${modeId}:${level}:${index}`,
      level,
      category: 'group',
      text: `${modeId} ${level} ${index}`,
      ...(modeId === 'truth-or-dare' ? { kind: (index % 2 === 0 ? 'truth' : 'dare') as CardKind } : {}),
    }));
  const forMode = (modeId: GameModeId) => ({
    getDeck: (level: SpicyLevel) => deckFor(modeId, level),
    choiceKinds: modeId === 'truth-or-dare' ? (['truth', 'dare'] as const) : undefined,
    minPlayers: modeId === 'most-likely' ? 3 : 2,
  });
  return { players, rng, ...forMode('spicy-questions'), forMode };
}

const MIX: GameModeId[] = ['spicy-questions', 'never-have-i-ever', 'most-likely', 'random-challenges'];

/** Plays the turn on the table the way the game screen would. */
function play(session: GameSession, ctx: SessionContext): GameSession {
  const modeCtx = { ...ctx, ...ctx.forMode!(session.modeId) };
  if (isAwaitingChoice(session, modeCtx)) return chooseCard(session, 'truth', modeCtx);
  if (session.modeId === 'never-have-i-ever' || session.modeId === 'most-likely') {
    return completeGroupRound(session, [], ctx);
  }
  return completeTurn(session, 'answered', ctx);
}

describe('mixed rounds', () => {
  it('deals every mode equally often and never the same mode twice in a row', () => {
    const ctx = makeMixedContext(makePlayers(4));
    let session = createSession({ ...base, round: { modeIds: MIX } }, ctx);
    const modes: GameModeId[] = [session.modeId];
    for (let i = 0; i < 11; i += 1) {
      session = play(session, ctx);
      modes.push(session.modeId);
    }
    for (const modeId of MIX) expect(modes.filter((id) => id === modeId)).toHaveLength(3);
    for (let i = 1; i < modes.length; i += 1) expect(modes[i]).not.toBe(modes[i - 1]);
    // Every card belongs to the mode it was dealt for, and none comes twice.
    const ids = session.playedByLevel.mild;
    expect(new Set(ids).size).toBe(ids.length);
    expect(session.current?.questionId?.startsWith(`${session.modeId}:`)).toBe(true);
  });

  it('leaves out modes that need more players', () => {
    const ctx = makeMixedContext(makePlayers(2));
    let session = createSession({ ...base, round: { modeIds: MIX } }, ctx);
    for (let i = 0; i < 12; i += 1) {
      expect(session.modeId).not.toBe('most-likely');
      session = play(session, ctx);
    }
  });

  it('switches away from a mode that no longer fits after a player leaves', () => {
    const players = makePlayers(3);
    const ctx = makeMixedContext(players);
    let session = createSession({ ...base, round: { modeIds: ['most-likely', 'spicy-questions'] } }, ctx);
    while (session.modeId !== 'most-likely') session = play(session, ctx);
    const synced = syncSessionPlayers(session, { ...ctx, players: players.slice(0, 2) });
    expect(synced.modeId).toBe('spicy-questions');
    expect(synced.current?.questionId?.startsWith('spicy-questions:')).toBe(true);
  });

  it('lets the player choose first when a Truth-or-Dare card comes up', () => {
    const ctx = makeMixedContext(makePlayers(3));
    let session = createSession({ ...base, round: { modeIds: ['truth-or-dare', 'spicy-questions'] } }, ctx);
    while (session.modeId !== 'truth-or-dare') session = play(session, ctx);
    const todCtx = { ...ctx, ...ctx.forMode!('truth-or-dare') };
    expect(isAwaitingChoice(session, todCtx)).toBe(true);
    const chosen = chooseCard(session, 'dare', todCtx);
    expect(chosen.current?.kind).toBe('dare');
    expect(chosen.current?.questionId?.startsWith('truth-or-dare:')).toBe(true);
  });

  it('passes over a mode without cards left', () => {
    const ctx = makeMixedContext(makePlayers(3), 2);
    let session = createSession({ ...base, round: { modeIds: ['spicy-questions', 'random-challenges'] } }, ctx);
    for (let i = 0; i < 3; i += 1) session = play(session, ctx);
    // Four cards in total: the last one comes from whichever mode still has one.
    expect(session.current?.questionId).toBeTruthy();
    session = play(session, ctx);
    expect(session.current?.questionId).toBeNull();
  });

  it('keeps the played cards of every mode when a saved game is repaired', () => {
    const ctx = makeMixedContext(makePlayers(3));
    let session = createSession({ ...base, round: { modeIds: MIX } }, ctx);
    for (let i = 0; i < 6; i += 1) session = play(session, ctx);
    const repaired = repairSession(session, ctx);
    expect(repaired.playedByLevel.mild).toEqual(session.playedByLevel.mild);
    expect(repaired.current).toEqual(session.current);
  });
});

describe('rounds in the game store', () => {
  const game = () => useGameStore.getState();

  beforeEach(() => resetStores());

  it('starts a round with a length and escalation and remembers the choice', () => {
    addPlayers('Lena', 'Max');
    expect(game().startGame('spicy-questions', 'extreme', { length: 20, escalate: true })).toBe(true);
    const session = game().session!;
    expect(session.round).toEqual({ length: 20, modeIds: ['spicy-questions'], escalate: true, peak: 'extreme' });
    expect(session.level).toBe('mild');
    expect(game().lastLevel).toBe('extreme');
    expect(game().lastRound).toEqual({ ...DEFAULT_LAST_ROUND, length: 20, escalate: true });
  });

  it('starts a mixed round without the modes the group is too small for', () => {
    addPlayers('Lena', 'Max');
    expect(game().startGame('spicy-questions', 'mild', { length: null, escalate: false, modeIds: MIX })).toBe(true);
    expect(game().session!.round.modeIds).toEqual(['spicy-questions', 'never-have-i-ever', 'random-challenges']);
    expect(game().lastRound.mixModeIds).toEqual(MIX);
    expect(sessionMinPlayers(game().session!)).toBe(2);
  });

  it('keeps a mixed round going when a player leaves, as long as one mode still fits', () => {
    addPlayers('Lena', 'Max', 'Sophie');
    game().startGame('most-likely', 'mild', { length: null, escalate: false, modeIds: ['most-likely', 'spicy-questions'] });
    expect(game().removePlayer(game().players[2]!.id)).toBe(true);
    expect(game().session).not.toBeNull();
    expect(game().session!.modeId).toBe('spicy-questions');
  });

  it('ends a fixed-length round after its last card', () => {
    addPlayers('Lena', 'Max');
    game().startGame('spicy-questions', 'mild', { length: 2, escalate: false });
    game().answer();
    game().pass();
    expect(isSessionOver(game().session!)).toBe(true);
    game().endGame();
    expect(game().lastResult).toMatchObject({ turnsCompleted: 2, mixed: false });
  });

  it('restores saved games from before rounds existed as endless rounds', () => {
    addPlayers('Lena', 'Max');
    game().startGame('spicy-questions', 'hot');
    const { round: _round, dealtByMode: _dealt, ...legacy } = game().session!;
    const restored = sanitizeGameData({ players: game().players, session: legacy, lastLevel: 'hot' });
    expect(restored.session?.round).toEqual({ length: null, modeIds: ['spicy-questions'], escalate: false, peak: 'hot' });
    expect(restored.session?.dealtByMode).toEqual({});
    expect(restored.lastRound).toBeUndefined();
  });

  it('does not resume a round that was already over and repairs broken round data', () => {
    addPlayers('Lena', 'Max');
    game().startGame('spicy-questions', 'mild', { length: 1, escalate: false });
    game().answer();
    const over = sanitizeGameData({ players: game().players, session: game().session });
    expect(over.session).toBeNull();

    game().startGame('spicy-questions', 'mild');
    const broken = {
      ...game().session!,
      round: { length: 'ten', modeIds: ['nope', 'spicy-questions'], escalate: 'yes', peak: 'boiling' },
      dealtByMode: { 'spicy-questions': -1, nope: 3 },
    };
    const repaired = sanitizeGameData({
      players: game().players,
      session: broken,
      lastRound: { length: -5, escalate: true, mixModeIds: ['nope'] },
    });
    expect(repaired.session?.round).toEqual({ length: null, modeIds: ['spicy-questions'], escalate: false, peak: 'mild' });
    expect(repaired.session?.dealtByMode).toEqual({});
    expect(repaired.lastRound).toEqual({ length: null, escalate: true, mixModeIds: DEFAULT_LAST_ROUND.mixModeIds });
  });
});
