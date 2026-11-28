import {
  changeLevel,
  chooseCard,
  completeGroupRound,
  isAwaitingChoice,
  remainingByKind,
  completeTurn,
  createSession,
  getCurrentQuestion,
  repairSession,
  replaceHiddenCard,
  reshuffleLevel,
  skipQuestion,
  syncSessionPlayers,
  type GameSession,
  type SessionContext,
} from '@/features/gameplay/engine/session';
import type { CardKind, Question } from '@/types';
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
    expect(next.stats[session.current!.playerId]).toEqual({
      answered: 1,
      passed: 0,
      skipped: 0,
      confessed: 0,
      picked: 0,
        truths: 0,
        dares: 0,
    });
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
      expect(session.stats.new).toEqual({
        answered: 0,
        passed: 0,
        skipped: 0,
        confessed: 0,
        picked: 0,
        truths: 0,
        dares: 0,
      });
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

  it('keeps hidden cards in the played lists when it repairs a session', () => {
    const ctx = makeContext(makePlayers(2), { mild: 5 });
    const session = start(ctx);
    const card = session.current!.questionId!;
    const getDeck: SessionContext['getDeck'] = (level) => ctx.getDeck(level).filter((question) => question.id !== card);
    // Hidden: only out of the deck for now – a card shown again must not come back in this game.
    expect(repairSession(session, { ...ctx, getDeck, isHidden: (id) => id === card }).playedByLevel.mild).toContain(card);
    // Unknown (e.g. removed by an app update): dropped as before.
    expect(repairSession(session, { ...ctx, getDeck }).playedByLevel.mild).not.toContain(card);
  });
});

describe('group rounds ("Ich hab noch nie")', () => {
  const groupOptions = { ...options, modeId: 'never-have-i-ever' as const };

  it('counts confessions and lets the next player read', () => {
    const ctx = makeContext(makePlayers(3), { mild: 10 });
    const session = createSession(groupOptions, ctx);
    const reader = session.current!.playerId;
    const next = completeGroupRound(session, ['p1', 'p3'], ctx);
    expect(next.stats.p1?.confessed).toBe(1);
    expect(next.stats.p2?.confessed).toBe(0);
    expect(next.stats.p3?.confessed).toBe(1);
    expect(next.current?.playerId).not.toBe(reader);
    expect(next.current?.questionId).not.toBe(session.current?.questionId);
    expect(next.turnsCompleted).toBe(1);
    // Reading a card is not "answering" a question.
    expect(next.stats[reader]?.answered).toBe(0);
  });

  it('allows a round without any confessions', () => {
    const ctx = makeContext(makePlayers(2));
    const session = createSession(groupOptions, ctx);
    const next = completeGroupRound(session, [], ctx);
    expect(Object.values(next.stats).every((stats) => stats.confessed === 0)).toBe(true);
    expect(next.turnsCompleted).toBe(1);
  });

  it('ignores unknown and duplicate player ids', () => {
    const ctx = makeContext(makePlayers(2));
    const session = createSession(groupOptions, ctx);
    const next = completeGroupRound(session, ['p1', 'p1', 'ghost'], ctx);
    expect(next.stats.p1?.confessed).toBe(1);
    expect(next.stats.ghost).toBeUndefined();
  });

  it('accumulates confessions over several rounds without repeating cards', () => {
    const ctx = makeContext(makePlayers(3), { mild: 12 });
    let session = createSession(groupOptions, ctx);
    const seen = new Set([session.current!.questionId]);
    for (let i = 0; i < 11; i += 1) {
      session = completeGroupRound(session, ['p2'], ctx);
      seen.add(session.current!.questionId);
    }
    expect(session.stats.p2?.confessed).toBe(11);
    expect(seen.size).toBe(12);
  });

  it('adds missing counters to sessions saved by older versions', () => {
    const ctx = makeContext(makePlayers(2));
    const session = createSession(groupOptions, ctx);
    const legacy: GameSession = {
      ...session,
      stats: { p1: { answered: 2, passed: 1, skipped: 0 } as never, p2: {} as never },
    };
    const repaired = repairSession(legacy, ctx);
    expect(repaired.stats.p1).toEqual({ answered: 2, passed: 1, skipped: 0, confessed: 0, picked: 0, truths: 0, dares: 0 });
    expect(repaired.stats.p2).toEqual({ answered: 0, passed: 0, skipped: 0, confessed: 0, picked: 0, truths: 0, dares: 0 });
    expect(completeGroupRound(repaired, ['p1'], ctx).stats.p1?.confessed).toBe(1);
  });
});

describe('group rounds ("Wer würde am ehesten?")', () => {
  const mltOptions = { ...options, modeId: 'most-likely' as const };

  it('counts picks instead of confessions', () => {
    const ctx = makeContext(makePlayers(4));
    const session = createSession(mltOptions, ctx);
    const next = completeGroupRound(session, ['p2', 'p4'], ctx, 'picked');
    expect(next.stats.p2?.picked).toBe(1);
    expect(next.stats.p4?.picked).toBe(1);
    expect(next.stats.p2?.confessed).toBe(0);
    expect(next.turnsCompleted).toBe(1);
  });
});

describe('choice rounds ("Wahrheit oder Pflicht")', () => {
  const todOptions = { ...options, modeId: 'truth-or-dare' as const };

  function todContext(truths = 4, dares = 4, players = makePlayers(3)): SessionContext {
    const deck: Question[] = [
      ...Array.from({ length: truths }, (_, i) => ({
        id: `t${i}`,
        level: 'mild' as const,
        category: 'personal' as const,
        kind: 'truth' as CardKind,
        text: `Wahrheit ${i}?`,
      })),
      ...Array.from({ length: dares }, (_, i) => ({
        id: `d${i}`,
        level: 'mild' as const,
        category: 'funny' as const,
        kind: 'dare' as CardKind,
        text: `Pflicht ${i} mit {other}.`,
      })),
    ];
    return { players, rng: createSeededRng(5), getDeck: () => deck, choiceKinds: ['truth', 'dare'] };
  }

  it('KARTE AUSBLENDEN: deals another card of the chosen kind and counts nothing', () => {
    const base = todContext();
    const session = chooseCard(createSession(todOptions, base), 'dare', base);
    const hidden = session.current!.questionId!;
    const ctx: SessionContext = {
      ...base,
      getDeck: (level) => base.getDeck(level).filter((question) => question.id !== hidden),
      isHidden: (id) => id === hidden,
    };
    const next = replaceHiddenCard(session, ctx);
    expect(next.current).toMatchObject({ playerId: session.current!.playerId, kind: 'dare' });
    expect(next.current!.questionId).toMatch(/^d/);
    expect(next.current!.questionId).not.toBe(hidden);
    expect(next.stats).toEqual(session.stats);
    expect(next.turnsCompleted).toBe(session.turnsCompleted);
    // Still counts as played: shown again later, it does not come back in this game.
    expect(next.playedByLevel.mild).toContain(hidden);
  });

  it('KARTE AUSBLENDEN: the player chooses again when no card of that kind is left', () => {
    const base = todContext(2, 1);
    const session = chooseCard(createSession(todOptions, base), 'dare', base);
    const hidden = session.current!.questionId!;
    const ctx: SessionContext = {
      ...base,
      getDeck: (level) => base.getDeck(level).filter((question) => question.id !== hidden),
    };
    const next = replaceHiddenCard(session, ctx);
    expect(next.current).toEqual({ playerId: session.current!.playerId, questionId: null, targetPlayerId: null, kind: null });
    expect(remainingByKind(next, ctx.getDeck, ['truth', 'dare'])).toEqual({ truth: 2, dare: 0 });
  });

  it('starts every turn with a choice instead of a card', () => {
    const ctx = todContext();
    const session = createSession(todOptions, ctx);
    expect(isAwaitingChoice(session, ctx)).toBe(true);
    expect(session.current?.questionId).toBeNull();
    expect(session.playedByLevel.mild).toEqual([]);
    expect(remainingByKind(session, ctx.getDeck, ['truth', 'dare'])).toEqual({ truth: 4, dare: 4 });
  });

  it('draws a card of the chosen kind', () => {
    const ctx = todContext();
    let session = createSession(todOptions, ctx);
    session = chooseCard(session, 'dare', ctx);
    expect(session.current?.kind).toBe('dare');
    expect(session.current?.questionId).toMatch(/^d/);
    expect(session.current?.targetPlayerId).not.toBe(session.current?.playerId);
    expect(isAwaitingChoice(session, ctx)).toBe(false);
    // A second choice in the same turn is ignored.
    expect(chooseCard(session, 'truth', ctx)).toBe(session);
  });

  it('counts truths and dares and returns to the choice for the next player', () => {
    const ctx = todContext();
    let session = createSession(todOptions, ctx);
    const first = session.current!.playerId;
    session = completeTurn(chooseCard(session, 'truth', ctx), 'answered', ctx);
    expect(session.stats[first]).toMatchObject({ answered: 1, truths: 1, dares: 0 });
    expect(session.current?.playerId).not.toBe(first);
    expect(isAwaitingChoice(session, ctx)).toBe(true);

    const second = session.current!.playerId;
    session = completeTurn(chooseCard(session, 'dare', ctx), 'answered', ctx);
    expect(session.stats[second]).toMatchObject({ dares: 1, truths: 0 });
  });

  it('lets a player pass before or after choosing', () => {
    const ctx = todContext();
    let session = createSession(todOptions, ctx);
    const first = session.current!.playerId;
    session = completeTurn(session, 'passed', ctx);
    expect(session.stats[first]).toMatchObject({ passed: 1, truths: 0, dares: 0 });
    const second = session.current!.playerId;
    session = completeTurn(chooseCard(session, 'dare', ctx), 'passed', ctx);
    expect(session.stats[second]).toMatchObject({ passed: 1, dares: 0 });
  });

  it('"Andere Karte" gives the same player a new card of the same kind', () => {
    const ctx = todContext(3, 3);
    let session = chooseCard(createSession(todOptions, ctx), 'truth', ctx);
    const player = session.current!.playerId;
    const firstCard = session.current!.questionId;
    session = skipQuestion(session, ctx);
    expect(session.current?.playerId).toBe(player);
    expect(session.current?.kind).toBe('truth');
    expect(session.current?.questionId).not.toBe(firstCard);
    expect(session.stats[player]?.skipped).toBe(1);
  });

  it('goes back to the choice when no card of that kind is left', () => {
    const ctx = todContext(1, 2);
    let session = chooseCard(createSession(todOptions, ctx), 'truth', ctx);
    session = skipQuestion(session, ctx);
    expect(isAwaitingChoice(session, ctx)).toBe(true);
    expect(remainingByKind(session, ctx.getDeck, ['truth', 'dare'])).toEqual({ truth: 0, dare: 2 });
    // An exhausted kind cannot be chosen.
    expect(chooseCard(session, 'truth', ctx)).toBe(session);
    expect(chooseCard(session, 'dare', ctx).current?.kind).toBe('dare');
  });

  it('never repeats cards and allows reshuffling once everything is played', () => {
    const ctx = todContext(2, 2);
    let session = createSession(todOptions, ctx);
    const seen: string[] = [];
    for (const kind of ['truth', 'dare', 'truth', 'dare'] as const) {
      session = chooseCard(session, kind, ctx);
      seen.push(session.current!.questionId!);
      session = completeTurn(session, 'answered', ctx);
    }
    expect(new Set(seen).size).toBe(4);
    expect(remainingByKind(session, ctx.getDeck, ['truth', 'dare'])).toEqual({ truth: 0, dare: 0 });
    session = reshuffleLevel(session, ctx);
    expect(isAwaitingChoice(session, ctx)).toBe(true);
    expect(remainingByKind(session, ctx.getDeck, ['truth', 'dare'])).toEqual({ truth: 2, dare: 2 });
  });

  it('keeps the choice state when the level changes', () => {
    const ctx = todContext();
    let session = chooseCard(createSession(todOptions, ctx), 'dare', ctx);
    const player = session.current!.playerId;
    session = changeLevel(session, 'hot', ctx);
    expect(session.current?.playerId).toBe(player);
    expect(isAwaitingChoice(session, ctx)).toBe(true);
  });
});
