import {
  changeLevel,
  completeTurn,
  createSession,
  getCurrentQuestion,
  repairSession,
  reshuffleLevel,
  skipQuestion,
  syncSessionPlayers,
  type GameSession,
  type SessionContext,
} from '@/features/gameplay/engine/session';
import { createSeededRng } from '@/utils/random';

import { makeContext, makeDeck, makePlayers } from '../helpers/fixtures';

const options = { id: 's1', modeId: 'spicy-questions' as const, level: 'mild' as const, now: 1000 };

function start(ctx: SessionContext, level: 'mild' | 'hot' | 'extreme' = 'mild') {
  return createSession({ ...options, level }, ctx);
}

describe('game session', () => {
  it('starts with a player and an unplayed question of the selected level', () => {
    const ctx = makeContext(makePlayers(3));
    const session = start(ctx, 'hot');
    expect(session.level).toBe('hot');
    expect(session.current?.playerId).toMatch(/^p[123]$/);
    expect(session.current?.questionId).toMatch(/^hot_/);
    expect(session.playedByLevel.hot).toEqual([session.current?.questionId]);
    expect(getCurrentQuestion(session, ctx.getDeck)?.level).toBe('hot');
  });

  it('NÄCHSTE FRAGE: counts as answered and moves on to another player', () => {
    const ctx = makeContext(makePlayers(3));
    const session = start(ctx);
    const next = completeTurn(session, 'answered', ctx);
    expect(next.current?.playerId).not.toBe(session.current?.playerId);
    expect(next.current?.questionId).not.toBe(session.current?.questionId);
    expect(next.turnsCompleted).toBe(1);
    expect(next.stats[session.current!.playerId]).toEqual({ answered: 1, passed: 0, skipped: 0 });
    expect(next.turnCounts[session.current!.playerId]).toBe(1);
  });

  it('ICH PASSE: records a pass and the next player is up', () => {
    const ctx = makeContext(makePlayers(2));
    const session = start(ctx);
    const passed = completeTurn(session, 'passed', ctx);
    expect(passed.stats[session.current!.playerId]?.passed).toBe(1);
    expect(passed.current?.playerId).not.toBe(session.current?.playerId);
    expect(passed.playedByLevel.mild).toContain(session.current?.questionId);
  });

  it('ÜBERSPRINGEN: same player gets a new question, the skipped one never returns', () => {
    const ctx = makeContext(makePlayers(2), { mild: 6 });
    let session = start(ctx);
    const player = session.current!.playerId;
    const skippedId = session.current!.questionId;
    session = skipQuestion(session, ctx);
    expect(session.current?.playerId).toBe(player);
    expect(session.current?.questionId).not.toBe(skippedId);
    expect(session.stats[player]?.skipped).toBe(1);
    expect(session.turnsCompleted).toBe(0);

    const seen = new Set([skippedId, session.current!.questionId]);
    for (let i = 0; i < 4; i += 1) {
      session = completeTurn(session, 'answered', ctx);
      seen.add(session.current!.questionId);
    }
    expect(seen.size).toBe(6);
  });

  it('never repeats a question within a session until the deck is exhausted', () => {
    const ctx = makeContext(makePlayers(4), { mild: 25 });
    let session = start(ctx);
    const ids = [session.current!.questionId];
    for (let i = 0; i < 24; i += 1) {
      session = i % 3 === 0 ? skipQuestion(session, ctx) : completeTurn(session, 'answered', ctx);
      ids.push(session.current!.questionId);
    }
    expect(new Set(ids).size).toBe(25);
    // 26th card: nothing left.
    session = completeTurn(session, 'answered', ctx);
    expect(session.current?.questionId).toBeNull();
    expect(getCurrentQuestion(session, ctx.getDeck)).toBeNull();
  });

  it('empty deck: the session shows no question instead of crashing', () => {
    const ctx = makeContext(makePlayers(2), { mild: 0 });
    const session = start(ctx);
    expect(session.current?.questionId).toBeNull();
    expect(skipQuestion(session, ctx)).toBe(session);
    const next = completeTurn(session, 'answered', ctx);
    expect(next.current?.questionId).toBeNull();
  });

  it('reshuffles an exhausted level so questions can be played again', () => {
    const ctx = makeContext(makePlayers(2), { mild: 2 });
    let session = start(ctx);
    session = completeTurn(session, 'answered', ctx);
    session = completeTurn(session, 'answered', ctx);
    expect(session.current?.questionId).toBeNull();
    const player = session.current!.playerId;
    session = reshuffleLevel(session, ctx);
    expect(session.current?.questionId).not.toBeNull();
    expect(session.current?.playerId).toBe(player);
    expect(session.playedByLevel.mild).toHaveLength(1);
  });

  it('changes the level between rounds without losing the turn or repeating questions', () => {
    const ctx = makeContext(makePlayers(3), { mild: 5, hot: 5 });
    let session = start(ctx);
    const player = session.current!.playerId;
    const mildPlayed = [...session.playedByLevel.mild];

    session = changeLevel(session, 'hot', ctx);
    expect(session.level).toBe('hot');
    expect(session.current?.playerId).toBe(player);
    expect(session.current?.questionId).toMatch(/^hot_/);
    expect(session.playedByLevel.mild).toEqual(mildPlayed);

    session = changeLevel(session, 'mild', ctx);
    expect(session.current?.questionId).toMatch(/^mild_/);
    expect(mildPlayed).not.toContain(session.current?.questionId);
    expect(changeLevel(session, 'mild', ctx)).toBe(session);
  });

  it('switching to an exhausted level shows the empty state', () => {
    const ctx = makeContext(makePlayers(2), { mild: 3, hot: 1 });
    let session = start(ctx, 'hot');
    session = changeLevel(session, 'mild', ctx);
    session = changeLevel(session, 'hot', ctx);
    expect(session.current?.questionId).toBeNull();
  });

  it('assigns another player for {other} placeholders', () => {
    const players = makePlayers(3);
    const deck = makeDeck('mild', 10, 1); // every question has a placeholder
    const ctx: SessionContext = { players, rng: createSeededRng(3), getDeck: () => deck };
    let session = start(ctx);
    for (let i = 0; i < 6; i += 1) {
      expect(session.current?.targetPlayerId).not.toBeNull();
      expect(session.current?.targetPlayerId).not.toBe(session.current?.playerId);
      session = completeTurn(session, 'answered', ctx);
    }
  });

  describe('player changes during a game', () => {
    it('integrates a new player fairly', () => {
      const players = makePlayers(2);
      let ctx = makeContext(players);
      let session = start(ctx);
      for (let i = 0; i < 4; i += 1) session = completeTurn(session, 'answered', ctx);
      ctx = makeContext([...players, { id: 'new', name: 'Neu', colorIndex: 5 }]);
      session = syncSessionPlayers(session, ctx);
      expect(session.turnCounts.new).toBe(Math.min(session.turnCounts.p1!, session.turnCounts.p2!));
      expect(session.stats.new).toEqual({ answered: 0, passed: 0, skipped: 0 });
    });

    it('hands the current question to the next player if the active one leaves', () => {
      const players = makePlayers(3);
      const ctx = makeContext(players);
      const session = start(ctx);
      const active = session.current!.playerId;
      const remaining = players.filter((p) => p.id !== active);
      const synced = syncSessionPlayers(session, { ...ctx, players: remaining });
      expect(synced.current?.playerId).not.toBe(active);
      expect(remaining.map((p) => p.id)).toContain(synced.current?.playerId);
      expect(synced.current?.questionId).toBe(session.current?.questionId);
      expect(synced.turnCounts[active]).toBeUndefined();
    });

    it('re-targets {other} when the targeted player leaves', () => {
      const players = makePlayers(3);
      const deck = makeDeck('mild', 5, 1);
      const ctx: SessionContext = { players, rng: createSeededRng(9), getDeck: () => deck };
      const session = start(ctx);
      const target = session.current!.targetPlayerId!;
      const synced = syncSessionPlayers(session, {
        ...ctx,
        players: players.filter((p) => p.id !== target),
      });
      expect(synced.current?.targetPlayerId).not.toBe(target);
      expect(synced.current?.targetPlayerId).not.toBe(synced.current?.playerId);
    });
  });

  it('repairs persisted sessions that reference unknown questions', () => {
    const ctx = makeContext(makePlayers(2), { mild: 5 });
    const broken: GameSession = {
      ...start(ctx),
      playedByLevel: { mild: ['mild_001', 'deleted_question'], hot: ['gone'], extreme: [] },
      current: { playerId: 'p1', questionId: 'deleted_question', targetPlayerId: null },
    };
    const repaired = repairSession(broken, ctx);
    expect(repaired.playedByLevel.hot).toEqual([]);
    expect(repaired.playedByLevel.mild).not.toContain('deleted_question');
    expect(repaired.current?.questionId).toMatch(/^mild_/);
    expect(repaired.current?.playerId).toBe('p1');
  });
});
