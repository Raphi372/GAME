import type { Locale } from '@/types';

import site from '../../site/site.config.json';
import legal from './legal.json';

const EMAIL = /[^\s@<>()"']+@[^\s@<>()"']+\.[a-z]{2,}/i;
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * The contact address for players: `supportEmail` from site/site.config.json, otherwise the
 * e-mail address in the provider details – the same rule the website follows.
 */
export function resolveSupportEmail(supportEmail: unknown, providerContact: unknown): string | null {
  const explicit = text(supportEmail);
  if (explicit) return new RegExp(`^${EMAIL.source}$`, 'i').test(explicit) ? explicit : null;
  return text(providerContact)?.match(EMAIL)?.[0] ?? null;
}

/** The website's address without a trailing slash – only an https address counts. */
export function resolveWebsiteUrl(url: unknown): string | null {
  const value = text(url)?.replace(/\/+$/, '');
  return value && /^https:\/\/[^\s"'<>]+$/.test(value) ? value : null;
}

/**
 * Where players find help: the website (`npm run site:build`) and the contact e-mail. Both
 * stay `null` until site/site.config.json and src/config/legal.json are filled in – the app
 * then shows no help and feedback entries.
 */
export const SUPPORT: { websiteUrl: string | null; email: string | null } = {
  websiteUrl: resolveWebsiteUrl(site.url),
  email: resolveSupportEmail(site.supportEmail, legal.providerContact),
};

/** The help page of the website in the app language. */
export function helpPageUrl(websiteUrl: string, locale: Locale): string {
  return `${websiteUrl}/${locale}/support/`;
}
