import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('"Wahrheit oder Pflicht" mode', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('is playable from the home screen: choose, play, pass and see the summary', async () => {
    addPlayers('Lena', 'Max');
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: /^Wahrheit oder Pflicht\./ }));
    expect(router.getPathname()).toBe('/players');
    await user.press(screen.getByRole('button', { name: 'Weiter zur Level-Wahl' }));

    expect(await screen.findByText('So geht’s')).toBeOnTheScreen();
    expect(screen.getAllByText('110 Karten')).toHaveLength(3);
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');

    const session = () => useGameStore.getState().session!;
    // Every turn starts with the choice.
    expect(await screen.findByText('Wahrheit oder Pflicht?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Erledigt' })).not.toBeOnTheScreen();
    const first = session().current!.playerId;

    await user.press(screen.getByRole('button', { name: /^Wahrheit: Eine ehrliche Antwort\./ }));
    expect(session().current?.kind).toBe('truth');
    expect(screen.getByText('WAHRHEIT')).toBeOnTheScreen();

    // "Andere Karte" keeps the kind.
    const card = session().current!.questionId;
    await user.press(screen.getByRole('button', { name: 'Andere Karte' }));
    expect(session().current?.kind).toBe('truth');
    expect(session().current?.questionId).not.toBe(card);

    await user.press(screen.getByRole('button', { name: 'Erledigt' }));
    expect(session().stats[first]?.truths).toBe(1);
    expect(session().current?.playerId).not.toBe(first);
    expect(await screen.findByText('Wahrheit oder Pflicht?')).toBeOnTheScreen();

    // Second player picks a dare and does it.
    const second = session().current!.playerId;
    await user.press(screen.getByRole('button', { name: /^Pflicht: Eine kleine Aufgabe\./ }));
    expect(screen.getByText('PFLICHT')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Erledigt' }));
    expect(session().stats[second]?.dares).toBe(1);

    // Passing is possible directly on the choice screen.
    await user.press(screen.getByRole('button', { name: 'Ich passe' }));
    expect(session().stats[first]?.passed).toBe(1);

    await user.press(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.press(await screen.findByRole('button', { name: 'Beenden' }));
    expect(await screen.findByText('🏆 Die meisten Pflichten')).toBeOnTheScreen();
    expect(screen.getByText('Wahrheiten: 1 · Pflichten: 0 · Gepasst: 1')).toBeOnTheScreen();
  });

  it('disables a kind once all its cards are played', async () => {
    addPlayers('Lena', 'Max');
    const store = useGameStore.getState();
    store.startGame('truth-or-dare', 'mild');
    // Play every truth of the level.
    let guard = 0;
    while (guard < 200) {
      useGameStore.getState().chooseCard('truth');
      if (useGameStore.getState().session!.current!.kind !== 'truth') break;
      useGameStore.getState().answer();
      guard += 1;
    }
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    expect(await screen.findByRole('button', { name: /^Wahrheit: .*Noch 0 Karten\./ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Pflicht: / })).toBeEnabled();
    expect(screen.getByText('keine mehr')).toBeOnTheScreen();
  });
});
