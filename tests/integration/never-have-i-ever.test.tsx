import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('"Ich hab noch nie" mode', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('is playable from the home screen through to the summary', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: /^Ich hab noch nie\./ }));
    expect(router.getPathname()).toBe('/players');

    const input = await screen.findByLabelText('Name des neuen Spielers');
    for (const name of ['Lena', 'Max', 'Sophie']) {
      await user.type(input, name);
      await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    }
    await user.press(screen.getByRole('button', { name: 'Weiter zur Level-Wahl' }));

    // Level screen explains the rules and counts statements.
    expect(await screen.findByText('So geht’s')).toBeOnTheScreen();
    expect(screen.getAllByText('100 Aussagen')).toHaveLength(3);
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');

    const session = () => useGameStore.getState().session!;
    expect(session().modeId).toBe('never-have-i-ever');
    expect(await screen.findByText('Liest vor')).toBeOnTheScreen();
    expect(screen.getByText('ICH HAB NOCH NIE')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ich passe' })).not.toBeOnTheScreen();

    // Mark two players, unmark one again, then go on.
    const lena = useGameStore.getState().players.find((p) => p.name === 'Lena')!;
    const max = useGameStore.getState().players.find((p) => p.name === 'Max')!;
    await user.press(screen.getByRole('checkbox', { name: 'Lena hat es schon getan' }));
    await user.press(screen.getByRole('checkbox', { name: 'Max hat es schon getan' }));
    expect(screen.getByRole('checkbox', { name: 'Lena hat es schon getan' })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: 'Max hat es schon getan' }));
    expect(screen.getByRole('checkbox', { name: 'Max hat es schon getan' })).not.toBeChecked();

    const firstCard = session().current!.questionId;
    await user.press(screen.getByRole('button', { name: 'Nächste Karte' }));
    expect(session().stats[lena.id]?.confessed).toBe(1);
    expect(session().stats[max.id]?.confessed).toBe(0);
    expect(session().current!.questionId).not.toBe(firstCard);
    // Selection is reset for the new card.
    expect(screen.getByRole('checkbox', { name: 'Lena hat es schon getan' })).not.toBeChecked();

    // Skip keeps the reader and changes the card.
    const reader = session().current!.playerId;
    await user.press(screen.getByRole('button', { name: 'Überspringen' }));
    expect(session().current!.playerId).toBe(reader);

    await user.press(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.press(await screen.findByRole('button', { name: 'Beenden' }));
    expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
    expect(screen.getByText('🏆 Die meisten Geständnisse')).toBeOnTheScreen();
    expect(screen.getByText('1 Geständnis')).toBeOnTheScreen();
    expect(screen.getAllByText('0 Geständnisse')).toHaveLength(2);
  });

  it('shows the running mode on the resume card', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('never-have-i-ever', 'mild');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Laufendes Spiel · Ich hab noch nie')).toBeOnTheScreen();
  });
});
