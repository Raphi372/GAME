import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Everything SPICY NIGHT stores lives on the device only (AsyncStorage).
 * No account, no server, no tracking.
 */
export const STORAGE_KEYS = {
  settings: 'spicy-night/settings',
  game: 'spicy-night/game',
  customCards: 'spicy-night/custom-cards',
  hiddenCards: 'spicy-night/hidden-cards',
} as const;

function report(action: string, key: string, error: unknown) {
  if (__DEV__) {
    console.warn(`[storage] ${action} failed for "${key}"`, error);
  }
}

/** AsyncStorage wrapper that never throws – a broken storage must not crash the game. */
export const safeStorage: StateStorage = {
  async getItem(name) {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      report('read', name, error);
      return null;
    }
  },
  async setItem(name, value) {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      report('write', name, error);
    }
  },
  async removeItem(name) {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      report('remove', name, error);
    }
  },
};

export const persistStorage = createJSONStorage(() => safeStorage);

export async function clearPersistedData(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => safeStorage.removeItem(key)));
}
