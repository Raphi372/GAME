import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('app flow', () => {
  beforeEach(() => resetStores());

  it('asks for the age confirmation before anything else', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Bist du 18 oder älter?')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/age-gate');

    await user.press(screen.getByRole('button', { name: 'Ich bin 18+' }));
    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();
    expect(useSettingsStore.getState().ageConfirmedAt).not.toBeNull();
  });

  it('shows a friendly message for under-18s', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: 'Ich bin unter 18' }));
    expect(await screen.findByText('Schade – noch nicht!')).toBeOnTheScreen();
    expect(useSettingsStore.getState().ageConfirmedAt).toBeNull();
  });

  it('plays a full round: players → level → questions → summary', async () => {
    useSettingsStore.getState().confirmAge();
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: 'Play now' }));
    expect(router.getPathname()).toBe('/players');

    // Add players
    const input = await screen.findByLabelText('Name des neuen Spielers');
    const continueButton = screen.getByRole('button', { name: 'Weiter zur Level-Wahl' });
    expect(continueButton).toBeDisabled();
    await user.type(input, 'Lena');
    await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    await user.type(input, 'Max');
    await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    expect(screen.getByText('Lena')).toBeOnTheScreen();
    expect(screen.getByText('Max')).toBeOnTheScreen();
    expect(continueButton).toBeEnabled();

    // Choose level
    await user.press(continueButton);
    expect(router.getPathname()).toBe('/level');
    await user.press(screen.getByRole('radio', { name: /^Hot\./ }));
    expect(screen.getByRole('radio', { name: /^Hot\./ })).toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');

    // Gameplay
    const session = () => useGameStore.getState().session!;
    expect(session().level).toBe('hot');
    expect(await screen.findByText('Du bist dran')).toBeOnTheScreen();
    const firstPlayer = session().current!.playerId;
    const firstQuestion = session().current!.questionId;

    await user.press(screen.getByRole('button', { name: 'Überspringen' }));
    expect(session().current!.playerId).toBe(firstPlayer);
    expect(session().current!.questionId).not.toBe(firstQuestion);

    await user.press(screen.getByRole('button', { name: 'Ich passe' }));
    expect(session().current!.playerId).not.toBe(firstPlayer);

    await user.press(screen.getByRole('button', { name: 'Nächste Frage' }));
    expect(session().current!.playerId).toBe(firstPlayer);
    expect(session().turnsCompleted).toBe(2);

    // End game → summary
    await user.press(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.press(await screen.findByRole('button', { name: 'Beenden' }));
    expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/summary');
    expect(useGameStore.getState().session).toBeNull();
  });

  it('switches the level in-game, with consent for EXTREME', async () => {
    useSettingsStore.getState().confirmAge();
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'mild');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    await user.press(await screen.findByRole('button', { name: /^Level: MILD/ }));
    await user.press(await screen.findByRole('radio', { name: /^Extreme\./ }));
    expect(await screen.findByText('Extreme wird persönlich')).toBeOnTheScreen();
    expect(useGameStore.getState().session?.level).toBe('mild');

    await user.press(screen.getByRole('button', { name: 'Alle sind dabei' }));
    expect(useGameStore.getState().session?.level).toBe('extreme');
    expect(await screen.findByRole('button', { name: /^Level: EXTREME/ })).toBeOnTheScreen();
  });

  it('shows the empty-deck state and allows reshuffling', async () => {
    useSettingsStore.getState().confirmAge();
    addPlayers('Lena', 'Max');
    const store = useGameStore.getState();
    store.startGame('spicy-questions', 'mild');
    while (useGameStore.getState().session!.current!.questionId !== null) {
      useGameStore.getState().answer();
    }
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('Deck durchgespielt!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Nächste Frage' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Neu mischen' }));
    expect(useGameStore.getState().session!.current!.questionId).not.toBeNull();
    expect(await screen.findByRole('button', { name: 'Nächste Frage' })).toBeOnTheScreen();
  });

  it('redirects to the menu if no game is running', async () => {
    useSettingsStore.getState().confirmAge();
    const router = await renderRouter(APP_DIR, { initialUrl: '/game' });
    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
  });
});
