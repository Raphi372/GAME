import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { getDeck } from '@/features/question-decks';
import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

/** Puts a specific card on the table so the test does not depend on the random draw. */
function showCard(predicate: (text: string, seconds?: number) => boolean) {
  const session = useGameStore.getState().session!;
  const card = getDeck('random-challenges', session.level).find((q) => predicate(q.text, q.seconds))!;
  useGameStore.setState({
    session: { ...session, current: { ...session.current!, questionId: card.id, targetPlayerId: null } },
  });
  return card;
}

describe('"Random Challenges" mode', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('is playable from the home screen through to the summary', async () => {
    addPlayers('Lena', 'Max');
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: /^Random Challenges\./ }));
    await user.press(await screen.findByRole('button', { name: 'Weiter zur Level-Wahl' }));
    expect(await screen.findByText('So geht’s')).toBeOnTheScreen();
    expect(screen.getAllByText('100 Challenges')).toHaveLength(3);
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(router.getPathname()).toBe('/game');

    const session = () => useGameStore.getState().session!;
    expect(await screen.findByRole('button', { name: 'Geschafft' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Neu ziehen' })).toBeOnTheScreen();

    const first = session().current!.playerId;
    await user.press(screen.getByRole('button', { name: 'Geschafft' }));
    expect(session().stats[first]?.answered).toBe(1);

    await user.press(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.press(await screen.findByRole('button', { name: 'Beenden' }));
    expect(await screen.findByText('🏆 Die meisten Challenges')).toBeOnTheScreen();
    expect(screen.getByText('Geschafft: 1 · Gepasst: 0')).toBeOnTheScreen();
  });

  it('labels group challenges with "Alle" and normal ones with "Challenge"', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('random-challenges', 'mild');
    const groupCard = showCard((text) => text.startsWith('Alle: '));
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    expect(await screen.findByText('ALLE')).toBeOnTheScreen();
    expect(screen.getByText(groupCard.text.replace('Alle: ', ''))).toBeOnTheScreen();

    await act(async () => {
      showCard((text) => !text.startsWith('Alle: ') && !text.includes('{other}'));
    });
    expect(await screen.findByText('CHALLENGE')).toBeOnTheScreen();
  });

  it('keeps the right time after the app was in the background', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('random-challenges', 'mild');
    showCard((_text, seconds) => seconds === 20);
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    await user.press(await screen.findByRole('button', { name: 'Timer starten · 20 s' }));
    // In the background JS timers pause while the clock keeps running.
    await act(async () => {
      jest.setSystemTime(Date.now() + 12000);
      jest.advanceTimersByTime(250);
    });
    expect(screen.getByText('8')).toBeOnTheScreen();
  });

  it('names everyone with the best score on a tie', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('random-challenges', 'mild');
    useGameStore.getState().answer();
    useGameStore.getState().answer();
    useGameStore.getState().endGame();
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    expect(await screen.findByText('🏆 Die meisten Challenges')).toBeOnTheScreen();
    expect(screen.getByText('Lena & Max')).toBeOnTheScreen();
  });

  it('runs the timer of timed challenges and resets it for the next card', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('random-challenges', 'mild');
    const card = showCard((_text, seconds) => seconds === 20);
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    await user.press(await screen.findByRole('button', { name: `Timer starten · ${card.seconds} s` }));
    expect(screen.getByText('20')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('15')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(screen.getByText('Zeit ist um!')).toBeOnTheScreen();

    // A new card (skip) resets the timer.
    await act(async () => {
      showCard((text, seconds) => seconds === 15 && !text.includes('{other}'));
    });
    expect(screen.queryByText('Zeit ist um!')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Timer starten · 15 s' })).toBeOnTheScreen();
  });
});
