import { useGameStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

const game = () => useGameStore.getState();

describe('game store', () => {
  beforeEach(() => resetStores());

  describe('players', () => {
    it('adds players', () => {
      expect(game().addPlayer('Lena')).toEqual({ ok: true, name: 'Lena' });
      addPlayers('Max');
      expect(game().players.map((p) => p.name)).toEqual(['Lena', 'Max']);
      expect(new Set(game().players.map((p) => p.id)).size).toBe(2);
    });

    it('rejects invalid names', () => {
      addPlayers('Lena');
      expect(game().addPlayer('LENA')).toEqual({ ok: false, error: 'duplicate' });
      expect(game().addPlayer('')).toEqual({ ok: false, error: 'empty' });
      expect(game().players).toHaveLength(1);
    });

    it('renames players', () => {
      addPlayers('Lena', 'Max');
      const id = game().players[0]!.id;
      expect(game().renamePlayer(id, 'Lea').ok).toBe(true);
      expect(game().players[0]?.name).toBe('Lea');
      expect(game().renamePlayer(id, 'Max')).toEqual({ ok: false, error: 'duplicate' });
    });

    it('removes players', () => {
      addPlayers('Lena', 'Max', 'Sophie');
      const id = game().players[1]!.id;
      expect(game().removePlayer(id)).toBe(true);
      expect(game().players.map((p) => p.name)).toEqual(['Lena', 'Sophie']);
      expect(game().removePlayer('does-not-exist')).toBe(false);
    });

    it('supports up to 20 players', () => {
      for (let i = 1; i <= 21; i += 1) game().addPlayer(`Spieler ${i}`);
      expect(game().players).toHaveLength(20);
    });
  });

  describe('game flow', () => {
    it('needs at least two players to start', () => {
      addPlayers('Lena');
      expect(game().startGame('spicy-questions', 'mild')).toBe(false);
      expect(game().session).toBeNull();
      addPlayers('Max');
      expect(game().startGame('spicy-questions', 'mild')).toBe(true);
      expect(game().session?.level).toBe('mild');
    });

    it('does not start modes that are not available yet', () => {
      addPlayers('Lena', 'Max');
      expect(game().startGame('truth-or-dare', 'mild')).toBe(false);
    });

    it('starts with the selected level and remembers it', () => {
      addPlayers('Lena', 'Max');
      game().startGame('spicy-questions', 'extreme');
      expect(game().session?.current?.questionId).toMatch(/^extreme_/);
      expect(game().lastLevel).toBe('extreme');
    });

    it('answer, skip and pass update the session', () => {
      addPlayers('Lena', 'Max', 'Sophie');
      game().startGame('spicy-questions', 'hot');
      const first = game().session!.current!;

      game().skip();
      const afterSkip = game().session!.current!;
      expect(afterSkip.playerId).toBe(first.playerId);
      expect(afterSkip.questionId).not.toBe(first.questionId);

      game().pass();
      const afterPass = game().session!.current!;
      expect(afterPass.playerId).not.toBe(first.playerId);
      expect(game().session!.stats[first.playerId]).toEqual({
        answered: 0,
        passed: 1,
        skipped: 1,
        confessed: 0,
        picked: 0,
      });

      game().answer();
      expect(game().session!.current!.playerId).not.toBe(afterPass.playerId);
      expect(game().session!.turnsCompleted).toBe(2);
    });

    it('switches the level during a game', () => {
      addPlayers('Lena', 'Max');
      game().startGame('spicy-questions', 'mild');
      game().changeLevel('extreme');
      expect(game().session?.level).toBe('extreme');
      expect(game().session?.current?.questionId).toMatch(/^extreme_/);
      expect(game().lastLevel).toBe('extreme');
    });

    it('plays a whole deck without repeats, then reshuffles', () => {
      addPlayers('Lena', 'Max');
      game().startGame('spicy-questions', 'mild');
      const seen = new Set<string>([game().session!.current!.questionId!]);
      let guard = 0;
      while (game().session!.current!.questionId !== null && guard < 500) {
        game().answer();
        const id = game().session!.current!.questionId;
        if (id) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
        }
        guard += 1;
      }
      expect(seen.size).toBeGreaterThanOrEqual(100);
      game().reshuffle();
      expect(game().session!.current!.questionId).toMatch(/^mild_/);
    });

    it('keeps the session in sync when players change mid-game', () => {
      addPlayers('Lena', 'Max', 'Sophie');
      game().startGame('spicy-questions', 'mild');
      addPlayers('Jonas');
      const jonas = game().players.find((p) => p.name === 'Jonas')!;
      expect(game().session!.turnCounts[jonas.id]).toBe(0);

      const active = game().session!.current!.playerId;
      game().removePlayer(active);
      expect(game().session!.current!.playerId).not.toBe(active);
    });

    it('ends the game if fewer than two players remain', () => {
      addPlayers('Lena', 'Max');
      game().startGame('spicy-questions', 'mild');
      game().removePlayer(game().players[0]!.id);
      expect(game().session).toBeNull();
    });

    it('creates a result summary when the game ends', () => {
      addPlayers('Lena', 'Max');
      game().startGame('spicy-questions', 'hot');
      game().answer();
      game().pass();
      game().endGame();
      const result = game().lastResult!;
      expect(game().session).toBeNull();
      expect(result.level).toBe('hot');
      expect(result.turnsCompleted).toBe(2);
      expect(result.players.reduce((sum, p) => sum + p.answered + p.passed, 0)).toBe(2);
    });

    it('plays "Ich hab noch nie" with confessions and a summary', () => {
      addPlayers('Lena', 'Max', 'Sophie');
      expect(game().startGame('never-have-i-ever', 'hot')).toBe(true);
      expect(game().session?.current?.questionId).toMatch(/^nhie_hot_/);
      const [lena, max] = game().players;
      game().nextGroupCard([lena!.id, max!.id]);
      game().nextGroupCard([lena!.id]);
      game().skip();
      game().endGame();
      const result = game().lastResult!;
      expect(result.modeId).toBe('never-have-i-ever');
      expect(result.turnsCompleted).toBe(2);
      const byName = Object.fromEntries(result.players.map((p) => [p.name, p.confessed]));
      expect(byName).toEqual({ Lena: 2, Max: 1, Sophie: 0 });
    });

    it('plays "Wer würde am ehesten?" with picks (needs three players)', () => {
      addPlayers('Lena', 'Max');
      expect(game().startGame('most-likely', 'mild')).toBe(false);
      addPlayers('Sophie');
      expect(game().startGame('most-likely', 'mild')).toBe(true);
      expect(game().session?.current?.questionId).toMatch(/^mlt_mild_/);
      const [lena, max] = game().players;
      game().nextGroupCard([max!.id]);
      game().nextGroupCard([max!.id, lena!.id]);
      expect(game().session!.stats[max!.id]?.picked).toBe(2);
      expect(game().session!.stats[max!.id]?.confessed).toBe(0);
      // Removing a player below the minimum of three ends the game.
      game().removePlayer(lena!.id);
      expect(game().session).toBeNull();
    });

    it('ignores game actions when no game is running', () => {
      expect(() => {
        game().answer();
        game().pass();
        game().nextGroupCard(['x']);
        game().skip();
        game().changeLevel('hot');
        game().reshuffle();
        game().endGame();
      }).not.toThrow();
      expect(game().session).toBeNull();
    });
  });
});
