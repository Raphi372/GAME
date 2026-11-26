import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/services/storage';
import { useGameStore } from '@/store';
import { sanitizeGameData, toSession } from '@/store/gameStore';

import { resetStores } from '../helpers/stores';

const players = [
  { id: 'a', name: 'Lena', colorIndex: 0 },
  { id: 'b', name: 'Max', colorIndex: 1 },
];
const base = {
  id: 'session_1',
  modeId: 'spicy-questions',
  level: 'mild',
  turnCounts: { a: 0, b: 0 },
  playedByLevel: { mild: [], hot: [], extreme: [] },
  current: null,
};

describe('loading saved games', () => {
  beforeEach(async () => {
    await resetStores();
  });

  it.each([
    ['without stats', base],
    ['with broken played lists', { ...base, playedByLevel: { mild: 'x', hot: {}, extreme: [1, 'mild_001'] } }],
    ['with broken counters', { ...base, turnCounts: { a: 'x', b: -3 }, stats: { a: { answered: 'many' } }, turnsCompleted: 'x' }],
    ['with a broken current turn', { ...base, current: { playerId: 42 }, stats: 'x', startedAt: null }],
  ])('repairs a saved game %s instead of failing', (_name, session) => {
    const data = sanitizeGameData({ players, session });
    expect(data.session).not.toBeNull();
    const repaired = data.session!;
    expect(repaired.stats.a).toMatchObject({ answered: 0, passed: 0 });
    expect(Number.isFinite(repaired.turnsCompleted)).toBe(true);
    expect(Number.isFinite(repaired.startedAt)).toBe(true);
    expect(repaired.current?.questionId).toEqual(expect.any(String));
  });

  it('ignores data that is not a game at all', () => {
    expect(toSession('garbage')).toBeNull();
    expect(toSession({ ...base, modeId: 'unknown' })).toBeNull();
    expect(sanitizeGameData({ players, session: { id: 1 } }).session).toBeUndefined();
  });

  it('always finishes loading, so the app can start', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.game,
      JSON.stringify({ state: { players, session: base, lastLevel: 'mild' }, version: 1 }),
    );
    await useGameStore.persist.rehydrate();
    expect(useGameStore.persist.hasHydrated()).toBe(true);
    expect(useGameStore.getState().players).toHaveLength(2);
  });
});
