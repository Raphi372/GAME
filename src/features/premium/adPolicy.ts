/**
 * Advertising policy.
 *
 * The MVP contains no ads and no ad SDK. If ads are introduced later they must
 * never interrupt a running question / round. Every future ad placement has to
 * ask `canShowAd` first.
 */
export const ADS_ENABLED = false;

export type AppPhase = 'menu' | 'setup' | 'in-round' | 'round-summary';

export interface AdContext {
  phase: AppPhase;
  premium: boolean;
}

export function canShowAd(context: AdContext, adsEnabled: boolean = ADS_ENABLED): boolean {
  if (!adsEnabled) return false;
  if (context.premium) return false;
  return context.phase !== 'in-round' && context.phase !== 'setup';
}
