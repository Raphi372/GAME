import {
  CUSTOM_CARD_MAX_LENGTH,
  MAX_CUSTOM_CARDS,
  sanitizeCustomCards,
  validateCustomCard,
  type CustomCardDraft,
} from '@/features/custom-cards/model';
import { getDeck } from '@/features/question-decks';
import { getCurrentQuestion } from '@/features/gameplay/engine/session';
import {
  getPlayableDeck,
  useCustomCardsStore,
  useEntitlementsStore,
  useGameStore,
  useSettingsStore,
} from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

const draft = (overrides: Partial<CustomCardDraft>): CustomCardDraft => ({
  modeId: 'spicy-questions',
  level: 'mild',
  body: 'Was war dein schönster Moment heute',
  ...overrides,
});
const textOf = (result: ReturnType<typeof validateCustomCard>) => (result.ok ? result.text : result.error);

describe('custom card validation', () => {
  it('adds a fitting question mark or full stop and keeps the players’ own', () => {
    expect(textOf(validateCustomCard(draft({}), 'de'))).toBe('Was war dein schönster Moment heute?');
    expect(textOf(validateCustomCard(draft({ body: 'Erzähl von deinem Tag!' }), 'de'))).toBe('Erzähl von deinem Tag!');
    expect(textOf(validateCustomCard(draft({ body: '  zu   viele   Leerzeichen  ' }), 'de'))).toBe(
      'zu viele Leerzeichen?',
    );
  });

  it('adds the lead-in of group modes in the app language – never twice', () => {
    const nhie = { modeId: 'never-have-i-ever' as const, body: 'im Bus Karaoke gesungen' };
    expect(textOf(validateCustomCard(draft(nhie), 'de'))).toBe('Ich hab noch nie im Bus Karaoke gesungen.');
    expect(textOf(validateCustomCard(draft({ ...nhie, body: 'sung karaoke on a bus' }), 'en'))).toBe(
      'Never have I ever sung karaoke on a bus.',
    );
    expect(
      textOf(validateCustomCard(draft({ ...nhie, body: 'Ich hab noch nie im Bus Karaoke gesungen' }), 'de')),
    ).toBe('Ich hab noch nie im Bus Karaoke gesungen.');
    expect(textOf(validateCustomCard(draft({ modeId: 'most-likely', body: 'im Zoo heiraten' }), 'de'))).toBe(
      'Wer würde am ehesten im Zoo heiraten?',
    );
  });

  it('needs a kind for "Wahrheit oder Pflicht" and ends dares with a full stop', () => {
    const tod = { modeId: 'truth-or-dare' as const, body: 'Tanz mit {other}' };
    expect(textOf(validateCustomCard(draft(tod), 'de'))).toBe('kind');
    expect(validateCustomCard(draft({ ...tod, kind: 'dare' }), 'de')).toEqual({
      ok: true,
      text: 'Tanz mit {other}.',
      kind: 'dare',
    });
    expect(textOf(validateCustomCard(draft({ ...tod, body: 'Wen magst du', kind: 'truth' }), 'de'))).toBe(
      'Wen magst du?',
    );
  });

  it('allows a timer only for challenges, between 5 and 120 seconds', () => {
    const rc = { modeId: 'random-challenges' as const, body: 'Tanz wie ein Roboter' };
    expect(validateCustomCard(draft({ ...rc, seconds: 30 }), 'de')).toEqual({
      ok: true,
      text: 'Tanz wie ein Roboter.',
      seconds: 30,
    });
    expect(textOf(validateCustomCard(draft({ ...rc, seconds: 3 }), 'de'))).toBe('timer');
    expect(textOf(validateCustomCard(draft({ seconds: 30 }), 'de'))).toBe('timer');
  });

  it('only accepts the player placeholder, and not in group modes', () => {
    expect(validateCustomCard(draft({ body: 'Was magst du an {other}' }), 'de').ok).toBe(true);
    expect(textOf(validateCustomCard(draft({ body: 'Was magst du an {name}' }), 'de'))).toBe('placeholder');
    expect(
      textOf(validateCustomCard(draft({ modeId: 'never-have-i-ever', body: '{other} geküsst' }), 'de')),
    ).toBe('placeholder');
  });

  it('rejects empty, too short and too long cards', () => {
    expect(textOf(validateCustomCard(draft({ body: '   ' }), 'de'))).toBe('empty');
    expect(textOf(validateCustomCard(draft({ body: 'Hi' }), 'de'))).toBe('tooShort');
    expect(textOf(validateCustomCard(draft({ body: 'a'.repeat(CUSTOM_CARD_MAX_LENGTH) }), 'de'))).toBe('tooLong');
  });

  it('keeps the content rules: no drinking, no minors, nothing against anybody’s will', () => {
    const error = (body: string) => textOf(validateCustomCard(draft({ body }), 'de'));
    expect(error('Trink einen Shot')).toBe('drinking');
    expect(error('Take a sip of your drink')).toBe('drinking');
    expect(error('Wer hier war als Minderjährige verliebt')).toBe('minors');
    expect(error('Küss {other} gegen den Willen')).toBe('consent');
    expect(error('Force {other} to dance')).toBe('consent');
    expect(error('Wer hier war unter 18 verliebt')).toBe('minors');
    // Harmless words that only look similar stay allowed.
    expect(error('Was ist dein liebstes Getränk')).toBe('Was ist dein liebstes Getränk?');
    expect(error('Wie viele Exen hast du')).toBe('Wie viele Exen hast du?');
    expect(error('Wer hier ist unter 180 cm groß')).toBe('Wer hier ist unter 180 cm groß?');
    expect(error('Was hilft bei Schluckauf')).toBe('Was hilft bei Schluckauf?');
  });
});

describe('custom cards in Spanish', () => {
  const es = (overrides: Partial<CustomCardDraft>) => textOf(validateCustomCard(draft(overrides), 'es'));

  it('opens questions and exclamations with ¿ and ¡ – in the last sentence only', () => {
    expect(es({ body: 'Cuál fue tu mejor cita' })).toBe('¿Cuál fue tu mejor cita?');
    expect(es({ body: 'Piensa en tu ex. Qué le dirías?' })).toBe('Piensa en tu ex. ¿Qué le dirías?');
    expect(es({ body: '¿Qué harías?' })).toBe('¿Qué harías?');
    expect(es({ body: 'Dime, ¿qué harías?' })).toBe('Dime, ¿qué harías?');
    expect(es({ modeId: 'random-challenges', body: 'Baila 10 segundos!' })).toBe('¡Baila 10 segundos!');
    expect(es({ modeId: 'random-challenges', body: 'Todos: quién se ríe primero?' })).toBe(
      'Todos: ¿quién se ríe primero?',
    );
    // German and English cards stay exactly as typed.
    expect(textOf(validateCustomCard(draft({ body: 'Qué tal' }), 'de'))).toBe('Qué tal?');
  });

  it('adds the Spanish lead-ins – with or without the typed ¿', () => {
    expect(es({ modeId: 'never-have-i-ever', body: 'he cantado en el autobús' })).toBe(
      'Yo nunca he cantado en el autobús.',
    );
    expect(es({ modeId: 'never-have-i-ever', body: 'Yo nunca me he enamorado en vacaciones' })).toBe(
      'Yo nunca me he enamorado en vacaciones.',
    );
    for (const body of [
      'se case primero',
      'Quién es más probable que se case primero',
      '¿se case primero?',
      'se case primero.',
      'se case primero!',
    ]) {
      expect(es({ modeId: 'most-likely', body })).toBe('¿Quién es más probable que se case primero?');
    }
    // "Wer würde am ehesten …?" is always a question, too.
    expect(textOf(validateCustomCard(draft({ modeId: 'most-likely', body: 'im Zoo heiraten!' }), 'de'))).toBe(
      'Wer würde am ehesten im Zoo heiraten?',
    );
  });

  it('keeps the content rules in Spanish', () => {
    expect(es({ body: 'Bebe un trago si alguna vez mentiste' })).toBe('drinking');
    expect(es({ body: 'Quién se emborrachó primero' })).toBe('drinking');
    expect(es({ body: 'Quién salió con alguien menor de edad' })).toBe('minors');
    expect(es({ body: 'Disfrázate de colegiala' })).toBe('minors');
    expect(es({ body: 'Besa a {other} sin preguntar' })).toBe('consent');
    expect(es({ body: 'Obliga a {other} a bailar' })).toBe('consent');
    // In Latin America "tomar algo" means having a drink.
    expect(es({ modeId: 'random-challenges', body: 'Tómate una copa si alguna vez mentiste' })).toBe('drinking');
    expect(es({ modeId: 'random-challenges', body: 'Toma algo si alguna vez mentiste' })).toBe('drinking');
    expect(es({ body: 'Oblígale a contar su peor cita' })).toBe('consent');
    // "bebé" is a pet name, not a drink; taking someone's hand is not drinking either.
    expect(es({ modeId: 'random-challenges', body: 'Llama bebé a {other}' })).toBe('Llama bebé a {other}.');
    expect(es({ modeId: 'random-challenges', body: 'Toma la mano de {other} si quiere' })).toBe(
      'Toma la mano de {other} si quiere.',
    );
    // Reassuring players is not forcing them.
    expect(es({ modeId: 'random-challenges', body: 'Cuenta tu peor cita – nada es obligatorio' })).toBe(
      'Cuenta tu peor cita – nada es obligatorio.',
    );
    expect(es({ body: 'Nadie está obligado a responder: qué harías' })).toBe(
      'Nadie está obligado a responder: ¿qué harías?',
    );
  });
});

describe('stored custom cards', () => {
  it('drops broken entries, duplicates and kindless "Wahrheit oder Pflicht" cards', () => {
    const valid = { id: 'custom_1', modeId: 'spicy-questions', level: 'mild', text: 'Eigene Frage?', createdAt: 1 };
    expect(
      sanitizeCustomCards([
        valid,
        valid,
        { ...valid, id: 'other_2' },
        { ...valid, id: 'custom_3', modeId: 'unknown' },
        { ...valid, id: 'custom_4', modeId: 'truth-or-dare' },
        { ...valid, id: 'custom_5', seconds: 30, kind: 'dare' },
        'garbage',
      ]),
    ).toEqual([valid, { ...valid, id: 'custom_5' }]);
    expect(sanitizeCustomCards({})).toEqual([]);
  });
});

describe('custom cards store and decks', () => {
  beforeEach(async () => {
    await resetStores();
  });

  it('adds, updates and removes cards in the current language', () => {
    useSettingsStore.getState().setLocale('en');
    const store = () => useCustomCardsStore.getState();
    const added = store().addCard({ modeId: 'never-have-i-ever', level: 'hot', body: 'danced on a table' }, 42);
    expect(added.ok).toBe(true);
    const card = store().cards[0]!;
    expect(card).toMatchObject({ modeId: 'never-have-i-ever', level: 'hot', text: 'Never have I ever danced on a table.', createdAt: 42 });
    expect(card.id).toMatch(/^custom_/);

    expect(store().updateCard(card.id, { modeId: 'never-have-i-ever', level: 'hot', body: 'sung in the rain' }).ok).toBe(true);
    expect(store().cards[0]).toMatchObject({ id: card.id, text: 'Never have I ever sung in the rain.', createdAt: 42 });

    expect(store().addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Drink up' })).toEqual({
      ok: false,
      error: 'drinking',
    });
    store().removeCard(card.id);
    expect(store().cards).toEqual([]);
  });

  it('stops at the card limit', () => {
    const cards = Array.from({ length: MAX_CUSTOM_CARDS }, (_, index) => ({
      id: `custom_${index}`,
      modeId: 'spicy-questions' as const,
      level: 'mild' as const,
      text: `Frage Nummer ${index}?`,
      createdAt: index,
    }));
    useCustomCardsStore.setState({ cards });
    expect(
      useCustomCardsStore.getState().addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Noch eine Frage' }),
    ).toEqual({ ok: false, error: 'limit' });
  });

  it('plays custom cards only with Premium', () => {
    useCustomCardsStore.getState().addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Meine eigene Frage' });
    const builtIn = getDeck('spicy-questions', 'mild', { locale: 'de' });
    expect(getPlayableDeck('spicy-questions', 'mild', 'de')).toBe(builtIn);

    useEntitlementsStore.getState().setEntitlements({ premium: true });
    const deck = getPlayableDeck('spicy-questions', 'mild', 'de');
    expect(deck).toHaveLength(builtIn.length + 1);
    expect(deck.at(-1)).toMatchObject({ category: 'custom', text: 'Meine eigene Frage?' });
    expect(getPlayableDeck('spicy-questions', 'hot', 'de')).toHaveLength(getDeck('spicy-questions', 'hot').length);
  });

  it('deals a new card when the custom card on the table is deleted', () => {
    useEntitlementsStore.getState().setEntitlements({ premium: true });
    const result = useCustomCardsStore
      .getState()
      .addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Meine eigene Frage' });
    if (!result.ok) throw new Error('card not added');
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'mild');
    const session = useGameStore.getState().session!;
    useGameStore.setState({ session: { ...session, current: { ...session.current!, questionId: result.card.id } } });
    const deckFor = (level: 'mild' | 'hot' | 'extreme') => getPlayableDeck('spicy-questions', level, 'de');
    expect(getCurrentQuestion(useGameStore.getState().session!, deckFor)?.text).toBe('Meine eigene Frage?');

    useCustomCardsStore.getState().removeCard(result.card.id);
    useGameStore.getState().refreshDecks();
    const current = useGameStore.getState().session!.current!;
    expect(current.questionId).not.toBe(result.card.id);
    expect(getCurrentQuestion(useGameStore.getState().session!, deckFor)).not.toBeNull();
  });
});
