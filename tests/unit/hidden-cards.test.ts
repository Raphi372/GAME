import AsyncStorage from '@react-native-async-storage/async-storage';

import { describeHiddenCards } from '@/features/hidden-cards/describe';
import { getDeck } from '@/features/question-decks';
import { STORAGE_KEYS } from '@/services/storage';
import {
  getBuiltInDeck,
  getCustomQuestions,
  getPlayableDeck,
  MAX_HIDDEN_CARDS,
  sanitizeHiddenIds,
  useCustomCardsStore,
  useEntitlementsStore,
  useHiddenCardsStore,
} from '@/store';

import { flushPromises, resetStores } from '../helpers/stores';

const hidden = () => useHiddenCardsStore.getState();

describe('hidden cards', () => {
  beforeEach(async () => {
    await resetStores();
  });

  it('hides a card once and brings it back', () => {
    hidden().hideCard('mild_001');
    hidden().hideCard('mild_001');
    hidden().hideCard('hot_002');
    expect(hidden().ids).toEqual(['mild_001', 'hot_002']);

    hidden().showCard('mild_001');
    expect(hidden().ids).toEqual(['hot_002']);
    hidden().showAllCards();
    expect(hidden().ids).toEqual([]);
  });

  it('leaves hidden cards out of every deck and every count', () => {
    const full = getDeck('spicy-questions', 'mild', { locale: 'de' });
    const [first, second] = full;
    hidden().hideCard(first!.id);
    hidden().hideCard(second!.id);

    const playable = getPlayableDeck('spicy-questions', 'mild', 'de');
    expect(playable).toHaveLength(full.length - 2);
    expect(playable.map((card) => card.id)).not.toContain(first!.id);
    expect(getBuiltInDeck('spicy-questions', 'mild', 'en')).toHaveLength(full.length - 2);
    // Other modes and levels are untouched.
    expect(getPlayableDeck('spicy-questions', 'hot', 'de')).toHaveLength(getDeck('spicy-questions', 'hot').length);
  });

  it('can also hide the players’ own cards', () => {
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    const result = useCustomCardsStore
      .getState()
      .addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Was war dein schönstes Date?' });
    expect(result.ok).toBe(true);
    const id = result.ok ? result.card.id : '';
    expect(getCustomQuestions('spicy-questions', 'mild').map((card) => card.id)).toEqual([id]);

    hidden().hideCard(id);
    expect(getCustomQuestions('spicy-questions', 'mild')).toEqual([]);
    expect(getPlayableDeck('spicy-questions', 'mild', 'de').map((card) => card.id)).not.toContain(id);
  });

  it('forgets own cards once they are deleted', () => {
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    const add = (body: string) => {
      const result = useCustomCardsStore.getState().addCard({ modeId: 'spicy-questions', level: 'mild', body });
      if (!result.ok) throw new Error(result.error);
      return result.card.id;
    };
    const first = add('Was war dein schönstes Date?');
    const second = add('Wohin würdest du gern einmal reisen?');
    hidden().hideCard('mild_001');
    hidden().hideCard(first);
    hidden().hideCard(second);

    useCustomCardsStore.getState().removeCard(first);
    expect(hidden().ids).toEqual(['mild_001', second]);
    useCustomCardsStore.getState().resetCustomCards();
    expect(hidden().ids).toEqual(['mild_001']);
  });

  it('cleans up what it finds in the storage', () => {
    expect(sanitizeHiddenIds(null)).toEqual([]);
    expect(sanitizeHiddenIds('mild_001')).toEqual([]);
    expect(sanitizeHiddenIds(['mild_001', 7, '', '  ', 'mild_001', 'hot_002', 'x'.repeat(200)])).toEqual([
      'mild_001',
      'hot_002',
    ]);
    const many = Array.from({ length: MAX_HIDDEN_CARDS + 5 }, (_, index) => `card_${index}`);
    expect(sanitizeHiddenIds(many)).toHaveLength(MAX_HIDDEN_CARDS);
  });

  it('keeps the hidden cards after a restart', async () => {
    hidden().hideCard('mild_001');
    await flushPromises();
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.hiddenCards);
    expect(JSON.parse(stored!)).toEqual({ state: { ids: ['mild_001'] }, version: 1 });

    await AsyncStorage.setItem(
      STORAGE_KEYS.hiddenCards,
      JSON.stringify({ state: { ids: ['hot_002', 3, 'hot_002'] }, version: 1 }),
    );
    // What the app finds on the next start replaces what it had in memory.
    await useHiddenCardsStore.persist.rehydrate();
    expect(hidden().ids).toEqual(['hot_002']);
  });

  it('lists hidden cards newest first in the app language and skips cards that are gone', () => {
    const [mild] = getDeck('spicy-questions', 'mild', { locale: 'en' });
    const [dare] = getDeck('truth-or-dare', 'hot', { locale: 'en' }).filter((card) => card.kind === 'dare');
    const other = getDeck('spicy-questions', 'mild', { locale: 'de' }).find((card) => card.text.includes('{other}'));

    const cards = describeHiddenCards(
      [mild!.id, 'custom_deleted', dare!.id, ...(other ? [other.id] : [])],
      'en',
      [],
      'someone',
    );
    expect(cards.map((card) => card.id)).toEqual([...(other ? [other.id] : []), dare!.id, mild!.id]);
    expect(cards.find((card) => card.id === mild!.id)).toEqual({
      id: mild!.id,
      modeId: 'spicy-questions',
      level: 'mild',
      text: mild!.text,
      own: false,
    });
    expect(cards.find((card) => card.id === dare!.id)).toMatchObject({ modeId: 'truth-or-dare', kind: 'dare' });
    if (other) expect(cards[0]!.text).not.toContain('{other}');
  });
});
