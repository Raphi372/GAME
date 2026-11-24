import {
  initialTurnCount,
  pickNextPlayer,
  pickOtherPlayer,
  type TurnCounts,
} from '@/features/gameplay/engine/rotation';
import { createSeededRng } from '@/utils/random';

describe('player rotation', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];

  function simulate(playerIds: string[], turns: number, seed = 11) {
    const rng = createSeededRng(seed);
    const counts: TurnCounts = Object.fromEntries(playerIds.map((id) => [id, 0]));
    const order: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < turns; i += 1) {
      const next: string = pickNextPlayer(playerIds, counts, last, rng)!;
      order.push(next);
      counts[next] = (counts[next] ?? 0) + 1;
      last = next;
    }
    return { counts, order };
  }

  it('never picks the same player twice in a row', () => {
    const { order } = simulate(ids, 500);
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i]).not.toBe(order[i - 1]);
    }
  });

  it('gives every player the same number of turns in the long run', () => {
    const { counts } = simulate(ids, 503);
    const values = Object.values(counts);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it('is balanced after every full round', () => {
    const rng = createSeededRng(4);
    const counts: TurnCounts = Object.fromEntries(ids.map((id) => [id, 0]));
    let last: string | null = null;
    for (let round = 0; round < 10; round += 1) {
      const seen = new Set<string>();
      for (let i = 0; i < ids.length; i += 1) {
        const next: string = pickNextPlayer(ids, counts, last, rng)!;
        seen.add(next);
        counts[next] = (counts[next] ?? 0) + 1;
        last = next;
      }
      expect(seen.size).toBe(ids.length);
    }
  });

  it('is random – different seeds give different orders', () => {
    expect(simulate(ids, 20, 1).order).not.toEqual(simulate(ids, 20, 2).order);
  });

  it('alternates with two players', () => {
    const { order } = simulate(['x', 'y'], 10);
    expect(order.join('')).toMatch(/^(xy)+$|^(yx)+$/);
  });

  it('handles edge cases', () => {
    expect(pickNextPlayer([], {}, null, Math.random)).toBeNull();
    expect(pickNextPlayer(['solo'], { solo: 3 }, 'solo', Math.random)).toBe('solo');
  });

  it('lets new players start at the current minimum', () => {
    expect(initialTurnCount({ a: 4, b: 3, c: 5 }, ['a', 'b', 'c'])).toBe(3);
    expect(initialTurnCount({}, [])).toBe(0);
  });

  it('picks another player for {other} placeholders', () => {
    const rng = createSeededRng(8);
    for (let i = 0; i < 20; i += 1) {
      expect(pickOtherPlayer(ids, 'a', rng)).not.toBe('a');
    }
    expect(pickOtherPlayer(['a'], 'a', rng)).toBeNull();
  });
});
