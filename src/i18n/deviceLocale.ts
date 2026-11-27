import { isLocale, type Locale } from '@/types';

/** The device speaks none of the app's languages: the most widely understood one. */
export const UNSUPPORTED_LANGUAGE_FALLBACK: Locale = 'en';
/** The device languages cannot be read at all: the app's source language. */
export const UNKNOWN_DEVICE_FALLBACK: Locale = 'de';

type ExpoLocalization = typeof import('expo-localization');

/**
 * The language SPICY NIGHT starts in on a fresh install: the first of the device's
 * preferred languages the app speaks, English for any other language. Players can switch
 * in the settings; their choice is stored and wins from then on.
 */
export function detectDeviceLocale(): Locale {
  let preferred: readonly { languageCode: string | null }[];
  try {
    // Loaded here instead of at the top: expo-localization needs its native module as
    // soon as it is imported, and a development build without it would otherwise crash
    // on start instead of falling back to German.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as ExpoLocalization;
    preferred = getLocales();
  } catch {
    return UNKNOWN_DEVICE_FALLBACK;
  }
  for (const { languageCode } of preferred) {
    const code = languageCode?.toLowerCase();
    if (isLocale(code)) return code;
  }
  return UNSUPPORTED_LANGUAGE_FALLBACK;
}
