import { getLocales } from 'expo-localization';

import { isLocale, type Locale } from '@/types';

/** The device speaks none of the app's languages: the most widely understood one. */
export const UNSUPPORTED_LANGUAGE_FALLBACK: Locale = 'en';
/** The device languages cannot be read at all: the app's source language. */
export const UNKNOWN_DEVICE_FALLBACK: Locale = 'de';

/**
 * The language SPICY NIGHT starts in on a fresh install: the first of the device's
 * preferred languages the app speaks, English for any other language. Players can switch
 * in the settings; their choice is stored and wins from then on.
 */
export function detectDeviceLocale(): Locale {
  let preferred: readonly { languageCode: string | null }[];
  try {
    preferred = getLocales();
  } catch {
    // No native module (e.g. an outdated development build).
    return UNKNOWN_DEVICE_FALLBACK;
  }
  for (const { languageCode } of preferred) {
    const code = languageCode?.toLowerCase();
    if (isLocale(code)) return code;
  }
  return UNSUPPORTED_LANGUAGE_FALLBACK;
}
