import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

const session = () => useGameStore.getState().session;

describe('custom rounds', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('plays a round of 10 cards and then shows the summary', async () => {
    addPlayers('Lena', 'Max');
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/level' });

    await user.press(await screen.findByRole('radio', { name: 'Rundenlänge: 10 Karten' }));
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');
    expect(await screen.findByText('Karte 1 von 10')).toBeOnTheScreen();

    for (let card = 1; card < 10; card += 1) {
      await user.press(screen.getByRole('button', { name: 'Nächste Frage' }));
    }
    expect(screen.getByText('Karte 10 von 10')).toBeOnTheScreen();
    // Skipping does not count as a card.
    await user.press(screen.getByRole('button', { name: 'Überspringen' }));
    expect(screen.getByText('Karte 10 von 10')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ich passe' }));
    expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/summary');
    expect(session()).toBeNull();
    expect(useGameStore.getState().lastResult?.turnsCompleted).toBe(10);
  });

  it('builds up slowly from MILD to the chosen level', async () => {
    addPlayers('Lena', 'Max');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/level' });

    // Only possible with a fixed length and a goal above MILD.
    const escalate = await screen.findByRole('switch', { name: 'Langsam steigern' });
    expect(escalate).toBeDisabled();
    expect(screen.getByText('Geht nur mit fester Rundenlänge.')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Rundenlänge: 10 Karten' }));
    expect(screen.getByText('Wähle HOT oder EXTREME als Ziel.')).toBeOnTheScreen();
    await user.press(screen.getByTestId('level-hot'));
    expect(screen.getByText('Startet MILD und wird bis 🌶️🌶️ HOT heißer.')).toBeOnTheScreen();
    await user.press(screen.getByRole('switch', { name: 'Langsam steigern' }));
    expect(screen.getByRole('switch', { name: 'Langsam steigern' })).toBeChecked();

    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(await screen.findByRole('button', { name: /Level: MILD/ })).toBeOnTheScreen();
    for (let card = 1; card <= 5; card += 1) {
      await user.press(screen.getByRole('button', { name: 'Nächste Frage' }));
    }
    expect(session()?.level).toBe('hot');
    expect(screen.getByText('Jetzt wird’s heißer: 🌶️🌶️ HOT')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Level: HOT/ })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Nächste Frage' }));
    expect(screen.queryByText(/Jetzt wird’s heißer/)).not.toBeOnTheScreen();
  });

  it('remembers the round settings for the next game', async () => {
    addPlayers('Lena', 'Max');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/level' });
    await user.press(await screen.findByRole('radio', { name: 'Rundenlänge: 20 Karten' }));
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(useGameStore.getState().lastRound.length).toBe(20);

    useGameStore.getState().endGame();
    await renderRouter(APP_DIR, { initialUrl: '/level' });
    expect(await screen.findByRole('radio', { name: 'Rundenlänge: 20 Karten' })).toBeChecked();
  });

  it('mixes the chosen modes in one round', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByTestId('mode-mix'));
    expect(router.getPathname()).toBe('/players');
    // A mixed round only needs two players – modes needing more are left out.
    expect(screen.getByText('Mindestens 2, höchstens 20 Spieler.')).toBeOnTheScreen();
    const input = screen.getByLabelText('Name des neuen Spielers');
    for (const name of ['Lena', 'Max']) {
      await user.type(input, name);
      await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    }
    await user.press(screen.getByRole('button', { name: 'Weiter zur Level-Wahl' }));
    expect(router.getPathname()).toBe('/level');
    expect(screen.getByText('🎉 Gemischte Runde')).toBeOnTheScreen();

    // "Wer würde am ehesten?" needs three players.
    const mlt = screen.getByRole('checkbox', { name: 'Wer würde am ehesten? – ab 3 Spielern' });
    expect(mlt).toBeDisabled();
    expect(mlt).not.toBeChecked();

    // Down to one mode: nothing to mix, the game cannot start.
    for (const title of ['Ich hab noch nie', 'Wahrheit oder Pflicht', 'Random Challenges']) {
      await user.press(screen.getByRole('checkbox', { name: title }));
    }
    expect(screen.getByText('Wähle mindestens zwei Modi.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Spiel starten' })).toBeDisabled();

    await user.press(screen.getByRole('checkbox', { name: 'Random Challenges' }));
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');
    expect(session()?.round.modeIds).toEqual(['spicy-questions', 'random-challenges']);

    const seen = new Set<string>();
    for (let card = 0; card < 6; card += 1) {
      const modeId = session()!.modeId;
      seen.add(modeId);
      const label = modeId === 'random-challenges' ? '⚡ Random Challenges' : '🔥 Spicy Questions';
      expect(screen.getByText(label)).toBeOnTheScreen();
      await user.press(
        screen.getByRole('button', { name: modeId === 'random-challenges' ? 'Geschafft' : 'Nächste Frage' }),
      );
    }
    expect(seen).toEqual(new Set(['spicy-questions', 'random-challenges']));

    // The home screen calls it a mixed round.
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Laufendes Spiel · Gemischte Runde')).toBeOnTheScreen();
  });
});
