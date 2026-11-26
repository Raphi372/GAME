import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { useCustomCardsStore, useEntitlementsStore, useGameStore, useSettingsStore } from '@/store';

import { addPlayers, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('own cards', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('are a Premium feature – without Premium the screen explains it and links to Premium', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: 'Eigene Karten' }));
    expect(await screen.findByText('Eigene Karten gibt es mit Premium')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Karte hinzufügen' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Mehr zu Premium' }));
    expect(router.getPathname()).toBe('/premium');
    expect(await screen.findByText('Eigene Karten erstellen')).toBeOnTheScreen();
  });

  it('can be written, rejected, edited and deleted with Premium', async () => {
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/custom-cards' });

    await user.press(await screen.findByRole('radio', { name: 'Ich hab noch nie' }));
    await user.press(screen.getByRole('radio', { name: 'Hot' }));
    expect(screen.getByText('Noch keine eigenen Karten für dieses Level. Schreib die erste!')).toBeOnTheScreen();

    // A card with a drinking task is refused with an explanation.
    await user.press(screen.getByRole('button', { name: 'Karte hinzufügen' }));
    expect(await screen.findByText('Ich hab noch nie …')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Text der Karte'), 'einen Shot getrunken');
    await user.press(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ohne Alkohol/);
    expect(useCustomCardsStore.getState().cards).toEqual([]);

    // A valid card gets the lead-in and the full stop.
    await user.clear(screen.getByLabelText('Text der Karte'));
    await user.type(screen.getByLabelText('Text der Karte'), 'im Bus Karaoke gesungen');
    await user.press(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('Ich hab noch nie im Bus Karaoke gesungen.')).toBeOnTheScreen();
    expect(screen.getByText('1 eigene Karte')).toBeOnTheScreen();
    expect(useCustomCardsStore.getState().cards[0]).toMatchObject({ modeId: 'never-have-i-ever', level: 'hot' });

    // Edit
    await user.press(
      screen.getByRole('button', { name: 'Karte bearbeiten: Ich hab noch nie im Bus Karaoke gesungen.' }),
    );
    const input = await screen.findByLabelText('Text der Karte');
    expect(input).toHaveDisplayValue('im Bus Karaoke gesungen.');
    await user.clear(input);
    await user.type(input, 'im Regen getanzt');
    await user.press(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('Ich hab noch nie im Regen getanzt.')).toBeOnTheScreen();

    // Delete
    await user.press(screen.getByRole('button', { name: 'Karte löschen: Ich hab noch nie im Regen getanzt.' }));
    await user.press(await screen.findByRole('button', { name: 'Löschen' }));
    expect(await screen.findByText('Noch keine eigenen Karten für dieses Level. Schreib die erste!')).toBeOnTheScreen();
    expect(useCustomCardsStore.getState().cards).toEqual([]);
  });

  it('offers kind and timer where the mode needs them', async () => {
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/custom-cards?mode=random-challenges&level=mild' });

    await user.press(await screen.findByRole('button', { name: 'Karte hinzufügen' }));
    await user.press(await screen.findByRole('button', { name: 'Mitspieler einfügen' }));
    await user.type(screen.getByLabelText('Text der Karte'), 'zum Lachen bringen');
    await user.press(screen.getByRole('radio', { name: 'Timer: 30 s' }));
    await user.press(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('[Mitspieler] zum Lachen bringen.')).toBeOnTheScreen();
    expect(screen.getByText('30 s')).toBeOnTheScreen();
    expect(useCustomCardsStore.getState().cards[0]).toMatchObject({ text: '{other} zum Lachen bringen.', seconds: 30 });

    await user.press(screen.getByRole('radio', { name: 'Wahrheit oder Pflicht' }));
    await user.press(screen.getByRole('button', { name: 'Karte hinzufügen' }));
    await user.press(await screen.findByRole('radio', { name: 'Pflicht' }));
    await user.type(screen.getByLabelText('Text der Karte'), 'Sing ein Liebeslied');
    await user.press(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText('Sing ein Liebeslied.')).toBeOnTheScreen();
    expect(screen.getByText('Pflicht')).toBeOnTheScreen();
  });

  it('show up in the level count and in the game', async () => {
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    const result = useCustomCardsStore
      .getState()
      .addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Was ist dein Lieblingswitz' });
    if (!result.ok) throw new Error('card not added');
    addPlayers('Lena', 'Max');

    await renderRouter(APP_DIR, { initialUrl: '/level?mode=spicy-questions' });
    expect(await screen.findByText('110 Fragen + 1 eigene')).toBeOnTheScreen();

    await act(async () => {
      useGameStore.getState().startGame('spicy-questions', 'mild');
      const session = useGameStore.getState().session!;
      useGameStore.setState({
        session: { ...session, current: { ...session.current!, questionId: result.card.id } },
      });
    });
    await renderRouter(APP_DIR, { initialUrl: '/game' });
    expect(await screen.findByText('Was ist dein Lieblingswitz?')).toBeOnTheScreen();
    expect(screen.getByText('Eigene Karte')).toBeOnTheScreen();
  });
});
