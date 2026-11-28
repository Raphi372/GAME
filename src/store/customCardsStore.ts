import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  CUSTOM_ID_PREFIX,
  MAX_CUSTOM_CARDS,
  sanitizeCustomCards,
  validateCustomCard,
  type CustomCard,
  type CustomCardDraft,
  type CustomCardError,
} from '@/features/custom-cards/model';
import { persistStorage, STORAGE_KEYS } from '@/services/storage';
import { createId } from '@/utils/id';

import { useHiddenCardsStore } from './hiddenCardsStore';
import { useSettingsStore } from './settingsStore';

export type CustomCardResult = { ok: true; card: CustomCard } | { ok: false; error: CustomCardError };

export interface CustomCardsState {
  cards: CustomCard[];
  /** Adds a card written in the current app language. */
  addCard: (draft: CustomCardDraft, now?: number) => CustomCardResult;
  /** Replaces text, kind and timer of a card (mode and level come from the draft). */
  updateCard: (id: string, draft: CustomCardDraft) => CustomCardResult;
  removeCard: (id: string) => void;
  resetCustomCards: () => void;
}

const currentLocale = () => useSettingsStore.getState().locale;

export const useCustomCardsStore = create<CustomCardsState>()(
  persist(
    (set, get) => ({
      cards: [],
      addCard: (draft, now = Date.now()) => {
        if (get().cards.length >= MAX_CUSTOM_CARDS) return { ok: false, error: 'limit' };
        const result = validateCustomCard(draft, currentLocale());
        if (!result.ok) return result;
        const { ok: _ok, ...content } = result;
        const card: CustomCard = {
          id: createId(CUSTOM_ID_PREFIX.slice(0, -1)),
          modeId: draft.modeId,
          level: draft.level,
          createdAt: now,
          ...content,
        };
        set({ cards: [...get().cards, card] });
        return { ok: true, card };
      },
      updateCard: (id, draft) => {
        const existing = get().cards.find((card) => card.id === id);
        if (!existing) return { ok: false, error: 'empty' };
        const result = validateCustomCard(draft, currentLocale());
        if (!result.ok) return result;
        const { ok: _ok, ...content } = result;
        const card: CustomCard = {
          id,
          modeId: draft.modeId,
          level: draft.level,
          createdAt: existing.createdAt,
          ...content,
        };
        set({ cards: get().cards.map((entry) => (entry.id === id ? card : entry)) });
        return { ok: true, card };
      },
      removeCard: (id) => {
        set({ cards: get().cards.filter((card) => card.id !== id) });
        // A deleted card cannot come back – it leaves the hidden list as well.
        useHiddenCardsStore.getState().showCard(id);
      },
      resetCustomCards: () => {
        useHiddenCardsStore.getState().showCards(get().cards.map((card) => card.id));
        set({ cards: [] });
      },
    }),
    {
      name: STORAGE_KEYS.customCards,
      version: 1,
      storage: persistStorage,
      partialize: ({ cards }) => ({ cards }),
      merge: (persisted, current) => ({
        ...current,
        cards: sanitizeCustomCards((persisted as { cards?: unknown } | null)?.cards),
      }),
    },
  ),
);
