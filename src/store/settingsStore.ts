import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { detectDeviceLocale, matchDeviceLocale } from '@/i18n/deviceLocale';
import { persistStorage, STORAGE_KEYS } from '@/services/storage';
import { isLocale, type Locale } from '@/types';

export interface SettingsData {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  animationsEnabled: boolean;
  locale: Locale;
  /** Timestamp of the 18+ confirmation, `null` if not confirmed. */
  ageConfirmedAt: number | null;
  /** The short introduction after the first age confirmation was finished or skipped. */
  introSeen: boolean;
  /**
   * The device language the app saw at its last start (`null`: none the app speaks). When
   * it changes – also the per-app language in the system settings – the app follows it.
   */
  deviceLocale: Locale | null;
}

export interface SettingsState extends SettingsData {
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setLocale: (locale: Locale) => void;
  confirmAge: (now?: number) => void;
  revokeAgeConfirmation: () => void;
  completeIntro: () => void;
  resetSettings: () => void;
}

/** Default values. A fresh install takes its language from the device – see `initialSettings`. */
export const DEFAULT_SETTINGS: SettingsData = {
  soundEnabled: true,
  hapticsEnabled: true,
  animationsEnabled: true,
  locale: 'de',
  ageConfirmedAt: null,
  introSeen: false,
  deviceLocale: null,
};

/** Settings of a fresh install (and after "delete all data"): defaults in the device language. */
export function initialSettings(): SettingsData {
  return { ...DEFAULT_SETTINGS, locale: detectDeviceLocale(), deviceLocale: matchDeviceLocale() };
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
  if (typeof data.introSeen === 'boolean') result.introSeen = data.introSeen;
  if (isLocale(data.deviceLocale) || data.deviceLocale === null) result.deviceLocale = data.deviceLocale;
  return result;
}

/**
 * Restores the stored settings. The language picked in the app stays – unless the device
 * language changed since the last start (e.g. the app language in the system settings):
 * then the app follows the device.
 */
export function restoreSettings(persisted: unknown, current: SettingsData): SettingsData {
  const stored = sanitize(persisted);
  const restored = { ...current, ...stored };
  const device = matchDeviceLocale();
  if (device !== null && device !== stored.deviceLocale) {
    // Without a stored device language (saved by an older version) there is no change to follow.
    if (stored.deviceLocale !== undefined) restored.locale = device;
    restored.deviceLocale = device;
  }
  return restored;
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
      completeIntro: () => set({ introSeen: true }),
      resetSettings: () => set(initialSettings()),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      storage: persistStorage,
      partialize: ({ soundEnabled, hapticsEnabled, animationsEnabled, locale, ageConfirmedAt, introSeen, deviceLocale }) => ({
        soundEnabled,
        hapticsEnabled,
        animationsEnabled,
        locale,
        ageConfirmedAt,
        introSeen,
        deviceLocale,
      }),
      merge: (persisted, current) => ({ ...current, ...restoreSettings(persisted, current) }),
    },
  ),
);
