import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, within } from 'expo-router/testing-library';
import { Dimensions, StyleSheet, type ViewStyle } from 'react-native';

import { FEATURES } from '@/config/features';
import { LEGAL } from '@/config/legal';
import { STORAGE_KEYS } from '@/services/storage';
import { useCustomCardsStore, useEntitlementsStore, useGameStore, useSettingsStore } from '@/store';

import { addPlayers, flushPromises, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('players screen', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('validates, edits and removes players', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/players' });
    const input = await screen.findByLabelText('Name des neuen Spielers');

    await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte gib einen Namen ein.');

    await user.type(input, 'Lena');
    await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    await user.type(input, 'lena');
    await user.press(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Diesen Namen gibt es schon.');
    expect(screen.getByText('Noch 1 Spieler nötig')).toBeOnTheScreen();

    // Rename
    await user.press(screen.getByRole('button', { name: 'Lena umbenennen' }));
    const editInput = screen.getByLabelText('Neuer Name für Lena');
    await user.clear(editInput);
    await user.type(editInput, 'Lea');
    await user.press(screen.getByRole('button', { name: 'Namen speichern' }));
    expect(screen.getByText('Lea')).toBeOnTheScreen();
    expect(useGameStore.getState().players.map((p) => p.name)).toEqual(['Lea']);

    // Remove
    await user.press(screen.getByRole('button', { name: 'Lea entfernen' }));
    expect(screen.getByText('Noch niemand da. Füge mindestens zwei Spieler hinzu.')).toBeOnTheScreen();
    expect(useGameStore.getState().players).toEqual([]);
  });

  it('prevents removing below two players during a running game', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'mild');
    await renderRouter(APP_DIR, { initialUrl: '/players?from=game' });
    expect(await screen.findByRole('button', { name: 'Lena entfernen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zurück zum Spiel' })).toBeOnTheScreen();
  });
});

describe('level screen', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    addPlayers('Lena', 'Max');
  });

  it('shows all three spicy levels with their question counts', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/level' });
    const radios = await screen.findAllByRole('radio');
    // Three levels – plus the round length options below them.
    expect(radios.filter((radio) => /^level-/.test(radio.props.testID))).toHaveLength(3);
    expect(radios.filter((radio) => /^round-length-/.test(radio.props.testID))).toHaveLength(4);
    expect(screen.getByText('Let’s warm up.')).toBeOnTheScreen();
    expect(screen.getByText('Things are heating up.')).toBeOnTheScreen();
    expect(screen.getByText('Are you ready?')).toBeOnTheScreen();
    expect(screen.getAllByText(/\d+ Fragen/)).toHaveLength(3);
  });

  it('asks the group for consent before EXTREME', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/level' });
    await user.press(await screen.findByRole('radio', { name: /^Extreme\./ }));
    expect(await screen.findByText('Extreme wird persönlich')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Lieber nicht' }));
    expect(screen.getByRole('radio', { name: /^Extreme\./ })).not.toBeChecked();

    await user.press(screen.getByRole('radio', { name: /^Extreme\./ }));
    await user.press(await screen.findByRole('button', { name: 'Alle sind dabei' }));
    expect(screen.getByRole('radio', { name: /^Extreme\./ })).toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(useGameStore.getState().session?.level).toBe('extreme');
  });
});

describe('settings screen', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  it('toggles sound, vibration and animations and saves them locally', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    const sound = await screen.findByRole('switch', { name: 'Sound' });
    expect(sound).toBeChecked();
    await user.press(sound);
    await user.press(screen.getByRole('switch', { name: 'Vibration' }));
    await user.press(screen.getByRole('switch', { name: 'Animationen' }));
    expect(useSettingsStore.getState()).toMatchObject({
      soundEnabled: false,
      hapticsEnabled: false,
      animationsEnabled: false,
    });
    await flushPromises();
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.settings))!);
    expect(stored.state.soundEnabled).toBe(false);
  });

  it('switches the interface language', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await user.press(await screen.findByRole('radio', { name: 'English' }));
    expect(await screen.findByText('Settings')).toBeOnTheScreen();
    // All cards exist in English, so no "German only" note is shown.
    expect(screen.queryByText('Questions are currently available in German only.')).not.toBeOnTheScreen();
  });

  it('revoking the age confirmation brings back the age gate', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await user.press(await screen.findByRole('button', { name: 'Bestätigung widerrufen' }));
    await user.press(await screen.findByRole('button', { name: 'Widerrufen' }));
    expect(await screen.findByText('Bist du 18 oder älter?')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/age-gate');
  });

  it('shows each setting as a single switch (no nested controls)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(await screen.findByRole('switch', { name: 'Sound' })).toBeOnTheScreen();
    expect(screen.getAllByRole('switch', { includeHiddenElements: true })).toHaveLength(3);
  });

  it('deletes all local data', async () => {
    addPlayers('Lena', 'Max');
    useEntitlementsStore.setState({ entitlements: { premium: true } });
    useCustomCardsStore.getState().addCard({ modeId: 'spicy-questions', level: 'mild', body: 'Meine eigene Frage' });
    expect(useCustomCardsStore.getState().cards).toHaveLength(1);
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await user.press(await screen.findByRole('button', { name: 'Alle lokalen Daten löschen' }));
    const sheet = await screen.findByText('Alle Daten löschen?');
    expect(sheet).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Löschen' }));
    expect(useGameStore.getState().players).toEqual([]);
    expect(useCustomCardsStore.getState().cards).toEqual([]);
    expect(useSettingsStore.getState().ageConfirmedAt).toBeNull();
    expect(await screen.findByText('Bist du 18 oder älter?')).toBeOnTheScreen();
  });
});

describe('home screen', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows the game modes and offers to resume a running game', async () => {
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'hot');
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    expect(await screen.findByRole('button', { name: /^Spicy Questions/ })).toBeOnTheScreen();
    for (const title of ['Ich hab noch nie', 'Wahrheit oder Pflicht', 'Wer würde am ehesten\\?', 'Random Challenges']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${title}\\.`) })).toBeOnTheScreen();
    }
    const resume = screen.getByTestId('resume-card');
    await user.press(within(resume).getByRole('button', { name: 'Weiterspielen' }));
    expect(router.getPathname()).toBe('/game');
  });

  it('opens the premium preview without any purchase option', async () => {
    jest.replaceProperty(FEATURES, 'premium', true);
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: 'Premium' }));
    expect(await screen.findByText('Mehr Hitze kommt bald.')).toBeOnTheScreen();
    expect(screen.getByText('Noch nicht verfügbar. Es werden keine Zahlungen abgewickelt.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /kaufen|abonnieren/i })).not.toBeOnTheScreen();
  });
});

describe('privacy screen', () => {
  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
  });

  afterEach(() => jest.restoreAllMocks());

  it('is marked as a draft while the provider details are missing', async () => {
    jest.replaceProperty(LEGAL, 'providerContact', null);
    await renderRouter(APP_DIR, { initialUrl: '/settings/privacy' });
    expect(await screen.findByTestId('privacy-draft-note')).toBeOnTheScreen();
    expect(screen.getByText(/Anschrift und E-Mail-Adresse des Anbieters/)).toBeOnTheScreen();
  });

  it('shows the provider details and drops the draft note once they are filled in', async () => {
    jest.replaceProperty(LEGAL, 'providerContact', 'Beispiel GmbH\nBeispielweg 1\n12345 Beispielstadt\nhallo@example.com');
    await renderRouter(APP_DIR, { initialUrl: '/settings/privacy' });
    expect(await screen.findByText(/Beispiel GmbH/)).toBeOnTheScreen();
    expect(screen.queryByTestId('privacy-draft-note')).not.toBeOnTheScreen();
    expect(screen.queryByText(/Anschrift und E-Mail-Adresse des Anbieters/)).not.toBeOnTheScreen();
  });
});

describe('summary layout', () => {
  const phone = Dimensions.get('window');

  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    addPlayers('Lena', 'Max');
    useGameStore.getState().startGame('spicy-questions', 'mild');
    useGameStore.getState().answer();
    useGameStore.getState().endGame();
  });

  afterEach(() => Dimensions.set({ window: phone, screen: phone }));

  const setWindow = (width: number, fontScale: number) => {
    const window = { ...phone, width, fontScale };
    Dimensions.set({ window, screen: window });
  };
  const tileWidths = () =>
    screen.getAllByTestId('summary-stat').map((tile) => (StyleSheet.flatten(tile.props.style) as ViewStyle).flexBasis);

  it('shows two tiles per row with normal text', async () => {
    setWindow(390, 1);
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
    expect(new Set(tileWidths())).toEqual(new Set(['45%']));
  });

  it.each([
    ['large system text', 390, 1.3],
    ['a very narrow screen', 320, 1],
  ])('shows one tile per row with %s, so long labels keep fitting', async (_case, width, fontScale) => {
    setWindow(width, fontScale);
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
    expect(new Set(tileWidths())).toEqual(new Set(['100%']));
  });
});

