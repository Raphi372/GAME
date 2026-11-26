import { create } from 'zustand';

import { FREE_ENTITLEMENTS, type Entitlements } from '@/features/premium/entitlements';

export interface EntitlementsState {
  entitlements: Entitlements;
  /**
   * Only a real store purchase / restore may call this (see `features/premium/purchases.ts`).
   * The MVP sells nothing, so everybody stays on the free tier. Entitlements are not
   * persisted on purpose: they are restored from the platform store on every launch.
   */
  setEntitlements: (entitlements: Entitlements) => void;
}

export const useEntitlementsStore = create<EntitlementsState>()((set) => ({
  entitlements: FREE_ENTITLEMENTS,
  setEntitlements: (entitlements) => set({ entitlements }),
}));
