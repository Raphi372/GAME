import AsyncStorage from '@react-native-async-storage/async-storage';

import { setRng } from '@/services/randomSource';
import { DEFAULT_SETTINGS, INITIAL_GAME_DATA, useGameStore, useSettingsStore } from '@/store';
import { createSeededRng } from '@/utils/random';

/** Resets all stores and storage to a clean state with a deterministic RNG. */
export async function resetStores(seed = 1234) {
  setRng(createSeededRng(seed));
  await AsyncStorage.clear();
  useGameStore.setState({ ...INITIAL_GAME_DATA, lastResult: null });
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
}

export function addPlayers(...names: string[]) {
  for (const name of names) useGameStore.getState().addPlayer(name);
}

/**
 * Lets pending (promise based) AsyncStorage writes finish.
 * Uses microtasks only, so it also works while Jest fake timers are active
 * (expo-router's `renderRouter` enables them).
 */
export async function flushPromises(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}
