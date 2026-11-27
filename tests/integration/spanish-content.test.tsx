import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import { getDeck } from '@/features/question-decks';
import { initialSettings, useGameStore, useSettingsStore } from '@/store';

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

describe('Spanish card content', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    useSettingsStore.getState().setLocale('es');
  });

  it('shows "Yo nunca" cards with the Spanish lead-in and keeps the card when switching language', async () => {
    addPlayers('Lucía', 'Mateo');
    useGameStore.getState().startGame('never-have-i-ever', 'mild');
    showCard('nhie_mild_008');
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('YO NUNCA')).toBeOnTheScreen();
    expect(screen.getByText('le he guiñado el ojo a alguien.')).toBeOnTheScreen();
    expect(screen.getByText('¿Quién lo ha hecho?')).toBeOnTheScreen();

    await act(async () => {
      useSettingsStore.getState().setLocale('de');
    });
    expect(await screen.findByText('ICH HAB NOCH NIE')).toBeOnTheScreen();
    expect(screen.getByText('jemandem zugezwinkert.')).toBeOnTheScreen();
    expect(useGameStore.getState().session?.current?.questionId).toBe('nhie_mild_008');
  });

  it('opens "¿Quién es más probable?" questions with ¿ in the lead-in', async () => {
    addPlayers('Lucía', 'Mateo', 'Valeria');
    useGameStore.getState().startGame('most-likely', 'mild');
    showCard('mlt_mild_046');
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('¿QUIÉN ES MÁS PROBABLE QUE')).toBeOnTheScreen();
    expect(screen.getByText('sea la primera persona del grupo en casarse?')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Eligieron a Valeria' })).toBeOnTheScreen();
  });

  it('labels group challenges with "Todos"', async () => {
    addPlayers('Lucía', 'Mateo');
    useGameStore.getState().startGame('random-challenges', 'mild');
    const card = getDeck('random-challenges', 'mild', { locale: 'es' }).find((q) => q.text.startsWith('Todos: '))!;
    showCard(card.id);
    await renderRouter(APP_DIR, { initialUrl: '/game' });

    expect(await screen.findByText('TODOS')).toBeOnTheScreen();
    expect(screen.getByText(card.text.replace('Todos: ', ''))).toBeOnTheScreen();
  });
});

describe('Spanish on a Spanish device', () => {
  const mockedLocales = getLocales as jest.MockedFunction<typeof getLocales>;
  const germanDevice = mockedLocales.getMockImplementation()!;

  beforeEach(async () => {
    await resetStores();
    mockedLocales.mockImplementation(
      () => [{ languageTag: 'es-MX', languageCode: 'es' }] as unknown as ReturnType<typeof getLocales>,
    );
    // A fresh install: nothing stored yet, so the device language decides.
    useSettingsStore.setState(initialSettings());
  });

  afterEach(() => mockedLocales.mockImplementation(germanDevice));

  it('greets a fresh install in Spanish and keeps the language the player picks', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('¿Tienes 18 años o más?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tengo 18 o más' }));
    expect(await screen.findByText('Así se juega')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Saltar' }));
    expect(await screen.findByText('Modos de juego')).toBeOnTheScreen();
    expect(screen.getByText('Verdad o reto')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ajustes' }));
    await user.press(await screen.findByRole('radio', { name: 'English' }));
    expect(await screen.findByText('Settings')).toBeOnTheScreen();
    expect(useSettingsStore.getState().locale).toBe('en');
    await user.press(screen.getByRole('radio', { name: 'Español' }));
    expect(await screen.findByText('Ajustes')).toBeOnTheScreen();
    // Every card exists in Spanish, so there is no "German only" note.
    expect(screen.queryByText('Por ahora, las preguntas solo están disponibles en alemán.')).not.toBeOnTheScreen();
  });
});
