import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { detectDeviceLocale } from '@/i18n/deviceLocale';
import { persistStorage, STORAGE_KEYS } from '@/services/storage';
import { isLocale, type Locale } from '@/types';

export interface SettingsData {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  animationsEnabled: boolean;
  locale: Locale;
  /** Timestamp of the 18+ confirmation, `null` if not confirmed. */
  ageConfirmedAt: number | null;
}

export interface SettingsState extends SettingsData {
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setLocale: (locale: Locale) => void;
  confirmAge: (now?: number) => void;
  revokeAgeConfirmation: () => void;
  resetSettings: () => void;
}

/** Default values. A fresh install takes its language from the device – see `initialSettings`. */
export const DEFAULT_SETTINGS: SettingsData = {
  soundEnabled: true,
  hapticsEnabled: true,
  animationsEnabled: true,
  locale: 'de',
  ageConfirmedAt: null,
};

/** Settings of a fresh install (and after "delete all data"): defaults in the device language. */
export function initialSettings(): SettingsData {
  return { ...DEFAULT_SETTINGS, locale: detectDeviceLocale() };
}

function sanitize(persisted: unknown): Partial<SettingsData> {
  if (typeof persisted !== 'object' || persisted === null) return {};
  const data = persisted as Record<string, unknown>;
  const result: Partial<SettingsData> = {};
  if (typeof data.soundEnabled === 'boolean') result.soundEnabled = data.soundEnabled;
  if (typeof data.hapticsEnabled === 'boolean') result.hapticsEnabled = data.hapticsEnabled;
  if (typeof data.animationsEnabled === 'boolean') result.animationsEnabled = data.animationsEnabled;
  if (isLocale(data.locale)) result.locale = data.locale;
  if (typeof data.ageConfirmedAt === 'number' || data.ageConfirmedAt === null) {
    result.ageConfirmedAt = data.ageConfirmedAt;
  }
  return result;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings(),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setLocale: (locale) => set({ locale }),
      confirmAge: (now = Date.now()) => set({ ageConfirmedAt: now }),
      revokeAgeConfirmation: () => set({ ageConfirmedAt: null }),
      resetSettings: () => set(initialSettings()),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      storage: persistStorage,
      partialize: ({ soundEnabled, hapticsEnabled, animationsEnabled, locale, ageConfirmedAt }) => ({
        soundEnabled,
        hapticsEnabled,
        animationsEnabled,
        locale,
        ageConfirmedAt,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);
