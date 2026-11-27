import { useCallback } from 'react';

import { useSettingsStore } from '@/store/settingsStore';
import type { Locale } from '@/types';

import { de, type TranslationKey } from './de';
import { en } from './en';
import { es } from './es';

export type { TranslationKey } from './de';

export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { de, en, es };

/** BCP-47 tags for Intl APIs (dates, prices) – plain "es" for neutral Spanish. */
export const INTL_LOCALES: Record<Locale, string> = { de: 'de-DE', en: 'en-GB', es: 'es' };

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const template = dictionaries[locale][key] ?? de[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export function useTranslation(): { t: TranslateFn; locale: Locale; intlLocale: string } {
  const locale = useSettingsStore((state) => state.locale);
  const t = useCallback<TranslateFn>((key, params) => translate(locale, key, params), [locale]);
  return { t, locale, intlLocale: INTL_LOCALES[locale] };
}
