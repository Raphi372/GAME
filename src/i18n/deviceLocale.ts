import { isLocale, type Locale } from '@/types';

/** The device speaks none of the app's languages: the most widely understood one. */
export const UNSUPPORTED_LANGUAGE_FALLBACK: Locale = 'en';
/** The device languages cannot be read at all: the app's source language. */
export const UNKNOWN_DEVICE_FALLBACK: Locale = 'de';

type ExpoLocalization = typeof import('expo-localization');
type DeviceLanguages = readonly { languageCode: string | null }[];

/** The device's preferred languages in order, `null` if they cannot be read. */
function readDeviceLanguages(): DeviceLanguages | null {
  try {
    // Loaded here instead of at the top: expo-localization needs its native module as
    // soon as it is imported, and a development build without it would otherwise crash
    // on start instead of falling back to German.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as ExpoLocalization;
    return getLocales();
  } catch {
    return null;
  }
}

/**
 * The first of the device's preferred languages the app speaks, `null` if there is none.
 * On iOS and Android 13+ this is also the app language picked in the system settings.
 */
export function matchDeviceLocale(languages: DeviceLanguages | null = readDeviceLanguages()): Locale | null {
  for (const { languageCode } of languages ?? []) {
    const code = languageCode?.toLowerCase();
    if (isLocale(code)) return code;
  }
  return null;
}

/**
 * The language SPICY NIGHT starts in on a fresh install: the first of the device's
 * preferred languages the app speaks, English for any other language. Players can switch
 * in the settings; their choice is stored and wins until the device language changes.
 */
export function detectDeviceLocale(): Locale {
  const languages = readDeviceLanguages();
  if (languages === null) return UNKNOWN_DEVICE_FALLBACK;
  return matchDeviceLocale(languages) ?? UNSUPPORTED_LANGUAGE_FALLBACK;
}
