import type { Entitlements } from './entitlements';
import type { PlanId } from './plans';

export type PurchaseResult =
  | { status: 'success'; entitlements: Entitlements }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/**
 * Abstraction over the platform stores. A real implementation (App Store /
 * Google Play) can be plugged in later without touching the UI.
 */
export interface PurchaseService {
  isAvailable(): Promise<boolean>;
  purchase(planId: PlanId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
}

/** MVP implementation: never charges, never pretends a purchase succeeded. */
export const unavailablePurchaseService: PurchaseService = {
  async isAvailable() {
    return false;
  },
  async purchase() {
    return { status: 'unavailable' };
  },
  async restore() {
    return { status: 'unavailable' };
  },
};
