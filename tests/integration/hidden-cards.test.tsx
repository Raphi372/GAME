import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen, within } from 'expo-router/testing-library';

import { getDeck } from '@/features/question-decks';
import { getPlayableDeck, useGameStore, useHiddenCardsStore, useSettingsStore } from '@/store';
import { SPICY_LEVELS } from '@/types';

import { addPlayers, resetStores } from '../helpers/stores';

const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

const session = () => useGameStore.getState().session!;
const hiddenIds = () => useHiddenCardsStore.getState().ids;

async function hideCurrentCard(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('button', { name: 'Karte ausblenden' }));
  expect(screen.getByRole('heading', { name: 'Diese Karte ausblenden?' })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Ausblenden' }));
}

describe('hiding cards', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    addPlayers('Lena', 'Max', 'Sam');
  });

  it('takes a card out of every game – the same player gets the next one, nothing is counted', async () => {
    const user = userEvent.setup();
    useGameStore.getState().startGame('spicy-questions', 'mild');
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    const before = session();
    const card = before.current!.questionId!;

    await hideCurrentCard(user);

    expect(hiddenIds()).toEqual([card]);
    expect(session().current!.questionId).not.toBe(card);
    expect(session().current!.playerId).toBe(before.current!.playerId);
    expect(session().turnsCompleted).toBe(before.turnsCompleted);
    expect(session().stats[before.current!.playerId]).toEqual(before.stats[before.current!.playerId]);
    expect(getPlayableDeck('spicy-questions', 'mild', 'de').map((question) => question.id)).not.toContain(card);
    expect(screen.getByText(`Runde 1 · noch ${getDeck('spicy-questions', 'mild').length - 2} im Deck`)).toBeOnTheScreen();
  });

  it('keeps the card when the group changes its mind', async () => {
    const user = userEvent.setup();
    useGameStore.getState().startGame('spicy-questions', 'mild');
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    const card = session().current!.questionId;

    await user.press(screen.getByRole('button', { name: 'Karte ausblenden' }));
    await user.press(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(hiddenIds()).toEqual([]);
    expect(session().current!.questionId).toBe(card);
  });

  it('works in the group modes and for a chosen truth', async () => {
    const user = userEvent.setup();
    useGameStore.getState().startGame('never-have-i-ever', 'hot');
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    const statement = session().current!.questionId!;
    await hideCurrentCard(user);
    expect(hiddenIds()).toEqual([statement]);
    expect(session().current!.questionId).not.toBe(statement);

    await act(async () => {
      useGameStore.getState().startGame('truth-or-dare', 'mild');
    });
    await user.press(await screen.findByRole('button', { name: /^Wahrheit: Eine ehrliche Antwort\./ }));
    const truth = session().current!.questionId!;
    const player = session().current!.playerId;
    await hideCurrentCard(user);
    expect(hiddenIds()).toEqual([statement, truth]);
    // Like after skipping: another truth for the same person – no new choice.
    expect(session().current).toMatchObject({ playerId: player, kind: 'truth' });
    expect(session().current!.questionId).not.toBeNull();
    expect(session().current!.questionId).not.toBe(truth);
    expect(screen.queryByRole('button', { name: /^Wahrheit: Eine ehrliche Antwort\./ })).not.toBeOnTheScreen();
  });

  it('says so when every card of the level is hidden – reshuffling would not help', async () => {
    const user = userEvent.setup();
    useGameStore.getState().startGame('spicy-questions', 'mild');
    const current = session().current!.questionId!;
    for (const question of getDeck('spicy-questions', 'mild')) {
      if (question.id !== current) useHiddenCardsStore.getState().hideCard(question.id);
    }
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    await hideCurrentCard(user);
    expect(await screen.findByRole('heading', { name: 'Alle Karten ausgeblendet' })).toBeOnTheScreen();
    expect(
      screen.getByText('In MILD sind alle Karten ausgeblendet. Wechselt das Level oder holt Karten unter Einstellungen → Ausgeblendete Karten zurück.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Neu mischen' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Level wechseln' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Karte ausblenden' })).not.toBeOnTheScreen();
  });

  it('leaves hidden cards out of the card counts on the home screen', async () => {
    const total = SPICY_LEVELS.reduce((sum, level) => sum + getDeck('spicy-questions', level).length, 0);
    const [first, second] = getDeck('spicy-questions', 'hot');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    // The tile reads "<tagline> · 330 Fragen".
    expect(await screen.findByText(new RegExp(` · ${total} Fragen$`))).toBeOnTheScreen();

    await act(async () => {
      useHiddenCardsStore.getState().hideCard(first!.id);
      useHiddenCardsStore.getState().hideCard(second!.id);
    });
    expect(await screen.findByText(new RegExp(` · ${total - 2} Fragen$`))).toBeOnTheScreen();
  });

  it('lists hidden cards in the settings and brings them back one by one or all at once', async () => {
    const user = userEvent.setup();
    const [first, second] = getDeck('spicy-questions', 'hot');
    useHiddenCardsStore.getState().hideCard(first!.id);
    useHiddenCardsStore.getState().hideCard(second!.id);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    expect(await screen.findByText('2 ausgeblendet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ausgeblendete Karten' }));
    expect(await screen.findByRole('heading', { name: 'Ausgeblendete Karten' })).toBeOnTheScreen();
    expect(screen.getByText(first!.text)).toBeOnTheScreen();
    expect(screen.getAllByText('🔥 Spicy Questions · 🌶️🌶️ HOT')).toHaveLength(2);

    await user.press(screen.getAllByRole('button', { name: 'Wieder zeigen' })[0]!);
    expect(hiddenIds()).toEqual([first!.id]);
    expect(screen.queryByText(second!.text)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Alle wieder zeigen' }));
    const sheet = screen.getByTestId('hidden-restore-all-sheet');
    expect(within(sheet).getByRole('heading', { name: 'Alle Karten wieder zeigen?' })).toBeOnTheScreen();
    await user.press(within(sheet).getByRole('button', { name: 'Alle wieder zeigen' }));
    expect(hiddenIds()).toEqual([]);
    expect(screen.getByText(/^Keine Karten ausgeblendet\./)).toBeOnTheScreen();
  });

  it('forgets hidden cards with "Alle lokalen Daten löschen"', async () => {
    const user = userEvent.setup();
    useHiddenCardsStore.getState().hideCard(getDeck('spicy-questions', 'mild')[0]!.id);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Alle lokalen Daten löschen' }));
    await user.press(screen.getByRole('button', { name: 'Löschen' }));
    expect(hiddenIds()).toEqual([]);
  });

  it('shows the hidden cards in the app language', async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setLocale('es');
    const [card] = getDeck('most-likely', 'mild', { locale: 'es' });
    useHiddenCardsStore.getState().hideCard(card!.id);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Cartas ocultas' }));
    expect(await screen.findByText(card!.text)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mostrar de nuevo' })).toBeOnTheScreen();
  });
});
