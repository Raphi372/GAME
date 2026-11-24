/**
 * Planned Premium pricing – configuration only.
 *
 * IMPORTANT: The MVP does not sell anything. Real purchases must later be
 * implemented with the platform stores (Apple In-App Purchase / Google Play
 * Billing), e.g. via a store-compliant SDK. Prices shown in the stores always
 * take precedence over these values.
 */
export type PlanId = 'monthly' | 'yearly' | 'lifetime';

export interface PremiumPlan {
  id: PlanId;
  /** Price in the smallest currency unit (cents). */
  priceCents: number;
  currency: 'EUR';
  period: 'month' | 'year' | 'once';
  /** Product identifier to be created in App Store Connect / Google Play Console. */
  storeProductId: string;
}

export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  {
    id: 'monthly',
    priceCents: 299,
    currency: 'EUR',
    period: 'month',
    storeProductId: 'spicynight.premium.monthly',
  },
  {
    id: 'yearly',
    priceCents: 1499,
    currency: 'EUR',
    period: 'year',
    storeProductId: 'spicynight.premium.yearly',
  },
  {
    id: 'lifetime',
    priceCents: 1299,
    currency: 'EUR',
    period: 'once',
    storeProductId: 'spicynight.premium.lifetime',
  },
];

export function formatPrice(plan: PremiumPlan, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(
    plan.priceCents / 100,
  );
}

/** Feature flag: purchases stay disabled until a store integration exists. */
export const PURCHASES_ENABLED = false;
