import { act } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { getDeck } from '@/features/question-decks';
import { useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

/** Puts a specific card on the table so the test does not depend on the random draw. */
function showCard(id: string) {
  const session = useGameStore.getState().session!;
  useGameStore.setState({
    session: { ...session, current: { ...session.current!, questionId: id, targetPlayerId: null } },
  });
}

describe('English card content', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    useSettingsStore.getState().setLocale('en');
  });

  it('shows English cards with the English lead-in and switches language mid-game', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('never-have-i-ever', 'mild');
    showCard('nhie_mild_008');
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('NEVER HAVE I EVER')).toBeOnTheScreen();
    expect(screen.getByText('winked at someone.')).toBeOnTheScreen();

    // Same card, now in German – the running game is kept.
    await act(async () => {
      useSettingsStore.getState().setLocale('de');
    });
    expect(await screen.findByText('ICH HAB NOCH NIE')).toBeOnTheScreen();
    expect(screen.getByText('jemandem zugezwinkert.')).toBeOnTheScreen();
    expect(useGameStore.getState().session?.current?.questionId).toBe('nhie_mild_008');
  });

  it('labels English group challenges with "Everyone"', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('random-challenges', 'mild');
    const card = getDeck('random-challenges', 'mild', { locale: 'en' }).find((q) =>
      q.text.startsWith('Everyone: '),
    )!;
    showCard(card.id);
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('EVERYONE')).toBeOnTheScreen();
    expect(screen.getByText(card.text.replace('Everyone: ', ''))).toBeOnTheScreen();
  });
});
