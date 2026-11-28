import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORAGE_KEYS } from '@/services/storage';

/** More than every card there is: 1560 built in plus up to 500 own cards. */
export const MAX_HIDDEN_CARDS = 2500;

export interface HiddenCardsState {
  /** Cards the group never wants to see again (ids, oldest first). Stays on the device. */
  ids: string[];
  hideCard: (id: string) => void;
  showCard: (id: string) => void;
  /** Takes several cards off the list at once, e.g. own cards that were deleted. */
  showCards: (ids: readonly string[]) => void;
  showAllCards: () => void;
}

/** Unknown or broken storage content becomes an empty list; ids stay unique. */
export function sanitizeHiddenIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0 && id.length <= 120);
  return [...new Set(ids)].slice(-MAX_HIDDEN_CARDS);
}

export const useHiddenCardsStore = create<HiddenCardsState>()(
  persist(
    (set, get) => ({
      ids: [],
      hideCard: (id) => {
        if (get().ids.includes(id)) return;
        set({ ids: [...get().ids, id].slice(-MAX_HIDDEN_CARDS) });
      },
      showCard: (id) => {
        if (!get().ids.includes(id)) return;
        set({ ids: get().ids.filter((entry) => entry !== id) });
      },
      showCards: (ids) => {
        const gone = new Set(ids);
        const kept = get().ids.filter((entry) => !gone.has(entry));
        if (kept.length !== get().ids.length) set({ ids: kept });
      },
      showAllCards: () => set({ ids: [] }),
    }),
    {
      name: STORAGE_KEYS.hiddenCards,
      version: 1,
      storage: persistStorage,
      partialize: ({ ids }) => ({ ids }),
      merge: (persisted, current) => ({
        ...current,
        ids: sanitizeHiddenIds((persisted as { ids?: unknown } | null)?.ids),
      }),
    },
  ),
);

let cachedIds: readonly string[] | null = null;
let cachedSet: ReadonlySet<string> = new Set();

/** The hidden ids as a set – rebuilt only when the list changes. */
export function hiddenCardIds(): ReadonlySet<string> {
  const { ids } = useHiddenCardsStore.getState();
  if (ids !== cachedIds) {
    cachedIds = ids;
    cachedSet = new Set(ids);
  }
  return cachedSet;
}
