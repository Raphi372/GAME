import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { COUNTDOWN_STEP_MS } from '@/features/gameplay/components/Countdown';
import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('"Wer würde am ehesten?" mode', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('needs three players before the level can be chosen', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: /^Wer würde am ehesten\?\./ }));
    expect(router.getPathname()).toBe('/players');
    expect(screen.getByText('Mindestens 3, höchstens 20 Spieler.')).toBeOnTheScreen();

    const input = screen.getByLabelText('Name des neuen Spielers');
    for (const name of ['Lena', 'Max']) {
      await user.type(input, name);
      await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    }
    expect(screen.getByText('Noch 1 Spieler nötig')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Weiter zur Level-Wahl' })).toBeDisabled();
  });

  it('plays a round with countdown, picks and summary', async () => {
    addPlayers('Lena', 'Max', 'Sophie');
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/level?mode=most-likely' });

    expect(await screen.findByText('So geht’s')).toBeOnTheScreen();
    expect(screen.getAllByText('100 Fragen')).toHaveLength(3);
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');

    const session = () => useGameStore.getState().session!;
    expect(session().modeId).toBe('most-likely');
    expect(await screen.findByText('WER WÜRDE AM EHESTEN')).toBeOnTheScreen();
    expect(screen.getByText('Wer wurde gewählt?')).toBeOnTheScreen();

    // 3-2-1 countdown
    await user.press(screen.getByRole('button', { name: '3 · 2 · 1 – zeigen' }));
    expect(screen.getByText('3')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(COUNTDOWN_STEP_MS * 2);
    });
    expect(screen.getByText('1')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(COUNTDOWN_STEP_MS);
    });
    expect(screen.getByText('Zeigt!')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(COUNTDOWN_STEP_MS);
    });
    expect(screen.getByRole('button', { name: '3 · 2 · 1 – zeigen' })).toBeOnTheScreen();

    // Tie: two players picked.
    const max = useGameStore.getState().players.find((p) => p.name === 'Max')!;
    const sophie = useGameStore.getState().players.find((p) => p.name === 'Sophie')!;
    await user.press(screen.getByRole('checkbox', { name: 'Max wurde gewählt' }));
    await user.press(screen.getByRole('checkbox', { name: 'Sophie wurde gewählt' }));
    await user.press(screen.getByRole('button', { name: 'Nächste Karte' }));
    expect(session().stats[max.id]?.picked).toBe(1);
    expect(session().stats[sophie.id]?.picked).toBe(1);

    await user.press(screen.getByRole('checkbox', { name: 'Max wurde gewählt' }));
    await user.press(screen.getByRole('button', { name: 'Nächste Karte' }));
    expect(session().stats[max.id]?.picked).toBe(2);
    expect(session().stats[max.id]?.confessed).toBe(0);

    await user.press(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.press(await screen.findByRole('button', { name: 'Beenden' }));
    expect(await screen.findByText('🏆 Am häufigsten gewählt')).toBeOnTheScreen();
    expect(screen.getByText('2× gewählt')).toBeOnTheScreen();
    expect(screen.getByText('1× gewählt')).toBeOnTheScreen();
  });

  it('cancels a running countdown when the card changes', async () => {
    addPlayers('Lena', 'Max', 'Sophie');
    useGameStore.getState().startGame('most-likely', 'hot');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    await user.press(await screen.findByRole('button', { name: '3 · 2 · 1 – zeigen' }));
    expect(screen.getByText('3')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Überspringen' }));
    expect(screen.getByRole('button', { name: '3 · 2 · 1 – zeigen' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(COUNTDOWN_STEP_MS * 5);
    });
    expect(screen.queryByText('Zeigt!')).not.toBeOnTheScreen();
  });
});
