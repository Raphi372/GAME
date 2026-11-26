/**
 * Release switches.
 *
 * `premium` shows the Premium screen and the Premium-only "Eigene Karten" (custom cards).
 * It stays off until real in-app purchases exist (`PURCHASES_ENABLED` in
 * `features/premium/plans.ts`): the stores reject features that cannot be unlocked, and a
 * preview with prices nobody can pay is placeholder content (App Review Guideline 2.1).
 * The code behind it stays in place – switch both flags on together.
 */
export const FEATURES: { premium: boolean } = {
  premium: false,
};
