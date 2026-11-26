/**
 * Entitlements describe what the current user may access.
 * In the MVP everybody is on the free tier and *all* built-in content is free.
 */
export type ContentTier = 'free' | 'premium';

export interface Entitlements {
  premium: boolean;
}

export const FREE_ENTITLEMENTS: Entitlements = { premium: false };

export function canAccessTier(tier: ContentTier, entitlements: Entitlements): boolean {
  return tier === 'free' || entitlements.premium;
}

/** Premium features prepared for later releases. */
export const PREMIUM_FEATURES = [
  'extraPacks',
  'exclusiveCategories',
  'customQuestions',
  'adFree',
] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

/**
 * Every premium feature needs an active Premium entitlement. Entitlements only ever
 * come from a real store purchase (see `purchases.ts`) – never from the app itself.
 */
export function canUseFeature(_feature: PremiumFeature, entitlements: Entitlements): boolean {
  return entitlements.premium;
}
