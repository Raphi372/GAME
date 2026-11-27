import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearPersistedData, STORAGE_KEYS } from '@/services/storage';
import { DEFAULT_SETTINGS, useGameStore, useSettingsStore } from '@/store';
import { sanitizeGameData } from '@/store/gameStore';

import { addPlayers, flushPromises, resetStores } from '../helpers/stores';

async function readStored(key: string) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as { state: Record<string, unknown>; version: number }) : null;
}

describe('settings store', () => {
  beforeEach(() => resetStores());

  it('uses German and everything enabled by default', () => {
    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.locale).toBe('de');
    expect(DEFAULT_SETTINGS.ageConfirmedAt).toBeNull();
  });

  it('toggles sound, vibration and animations and switches the language', () => {
    const settings = useSettingsStore.getState();
    settings.setSoundEnabled(false);
    settings.setHapticsEnabled(false);
    settings.setAnimationsEnabled(false);
    settings.setLocale('en');
    expect(useSettingsStore.getState()).toMatchObject({
      soundEnabled: false,
      hapticsEnabled: false,
      animationsEnabled: false,
      locale: 'en',
    });
  });

  it('confirms and revokes the 18+ confirmation', () => {
    useSettingsStore.getState().confirmAge(123);
    expect(useSettingsStore.getState().ageConfirmedAt).toBe(123);
    useSettingsStore.getState().revokeAgeConfirmation();
    expect(useSettingsStore.getState().ageConfirmedAt).toBeNull();
  });
});

describe('local persistence', () => {
  beforeEach(() => resetStores());

  it('stores settings locally', async () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().confirmAge(42);
    await flushPromises();
    const stored = await readStored(STORAGE_KEYS.settings);
    expect(stored?.state).toMatchObject({ soundEnabled: false, ageConfirmedAt: 42 });
  });

  it('restores settings after an app restart', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ state: { hapticsEnabled: false, locale: 'en', ageConfirmedAt: 7 }, version: 1 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState()).toMatchObject({ hapticsEnabled: false, locale: 'en', ageConfirmedAt: 7 });
  });

  it('remembers the finished introduction and ignores a broken flag', async () => {
    useSettingsStore.getState().completeIntro();
    await flushPromises();
    expect((await readStored(STORAGE_KEYS.settings))?.state.introSeen).toBe(true);

    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ state: { introSeen: 'ja' }, version: 1 }));
    useSettingsStore.setState({ introSeen: false });
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().introSeen).toBe(false);
  });

  it('stores players and the running game (and nothing else)', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'hot');
    await flushPromises();
    const stored = await readStored(STORAGE_KEYS.game);
    expect(Object.keys(stored!.state).sort()).toEqual(['lastLevel', 'lastRound', 'players', 'session']);
    expect((stored!.state.players as { name: string }[]).map((p) => p.name)).toEqual(['Lena', 'Max']);
  });

  it('resumes a running game after an app restart', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'mild');
    useGameStore.getState().answer();
    const before = useGameStore.getState().session;
    await flushPromises();
    const persisted = await AsyncStorage.getItem(STORAGE_KEYS.game);

    // Simulate a fresh app start: empty memory, data only on the device.
    useGameStore.setState({ players: [], session: null });
    await flushPromises();
    await AsyncStorage.setItem(STORAGE_KEYS.game, persisted!);
    await useGameStore.persist.rehydrate();
    const after = useGameStore.getState().session;
    expect(after?.current).toEqual(before?.current);
    expect(after?.playedByLevel.mild).toEqual(before?.playedByLevel.mild);
    expect(useGameStore.getState().players).toHaveLength(2);
  });

  it('ignores corrupted data instead of crashing', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.game,
      JSON.stringify({ state: { players: 'kaputt', session: { foo: 1 }, lastLevel: 'lava' }, version: 1 }),
    );
    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().players).toEqual([]);
    expect(useGameStore.getState().session).toBeNull();
    expect(useGameStore.getState().lastLevel).toBe('mild');

    await AsyncStorage.setItem(STORAGE_KEYS.settings, '{not json');
    await expect(useSettingsStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useSettingsStore.getState().locale).toBe('de');
  });

  it('drops a stored session when fewer than two valid players exist', () => {
    const result = sanitizeGameData({
      players: [{ id: 'a', name: 'Solo', colorIndex: 0 }, { broken: true }],
      session: {
        id: 's',
        modeId: 'spicy-questions',
        level: 'mild',
        turnCounts: {},
        playedByLevel: {},
      },
    });
    expect(result.players).toHaveLength(1);
    expect(result.session).toBeNull();
  });

  it('deletes all local data', async () => {
    addPlayers('Lena', 'Max');
    useSettingsStore.getState().confirmAge(1);
    await flushPromises();
    await clearPersistedData();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.game)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
  });
});
