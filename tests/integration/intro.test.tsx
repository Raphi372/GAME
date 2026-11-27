import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { STORAGE_KEYS } from '@/services/storage';
import { useSettingsStore } from '@/store';

import { flushPromises, resetStores } from '../helpers/stores';

/** Renders the real app routes (paths are resolved from the project root). */
const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('introduction on the first start', () => {
  beforeEach(() => resetStores());

  it('follows the first age confirmation and leads through three steps to the home screen', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: 'Ich bin 18+' }));

    expect(await screen.findByText('So läuft eine Runde')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/intro');
    expect(screen.getByText('Schritt 1 von 3')).toBeOnTheScreen();
    // Nothing to go back to on the first step.
    expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText('Fair Play ist eingebaut')).toBeOnTheScreen();
    expect(screen.getByText('„Ich passe“ ist immer erlaubt – ohne Erklärung.')).toBeOnTheScreen();
    // Back one step and forward again.
    await user.press(screen.getByRole('button', { name: 'Zurück' }));
    expect(screen.getByText('So läuft eine Runde')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Weiter' }));
    await user.press(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByText('Eure Runde, eure Regeln')).toBeOnTheScreen();
    expect(screen.getByText('Schritt 3 von 3')).toBeOnTheScreen();
    // The last step has no "skip" – only the way into the game.
    expect(screen.queryByRole('button', { name: 'Überspringen' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Los geht’s' }));

    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
    expect(useSettingsStore.getState().introSeen).toBe(true);
  });

  it('can be skipped and is not shown again – also after a restart', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: 'Ich bin 18+' }));
    await user.press(await screen.findByRole('button', { name: 'Überspringen' }));
    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();

    await flushPromises();
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.settings))!);
    expect(stored.state.introSeen).toBe(true);

    // Revoking and confirming the age again does not repeat it.
    useSettingsStore.getState().revokeAgeConfirmation();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    await user.press(await screen.findByRole('button', { name: 'Ich bin 18+' }));
    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
  });

  it('is not shown to players who confirmed their age before it existed', async () => {
    useSettingsStore.getState().confirmAge();
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByRole('button', { name: 'Play now' })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
  });

  it('opens again from the settings and closes back to them', async () => {
    useSettingsStore.setState({ ageConfirmedAt: Date.now(), introSeen: true });
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await user.press(await screen.findByRole('button', { name: 'Einführung ansehen' }));

    expect(await screen.findByText('So läuft eine Runde')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/intro');
    // Reopened from the settings, "back" on the first step closes it.
    await user.press(screen.getByRole('button', { name: 'Zurück' }));
    expect(await screen.findByText('Einstellungen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/settings');

    await user.press(screen.getByRole('button', { name: 'Einführung ansehen' }));
    for (let step = 1; step < 3; step += 1) await user.press(await screen.findByRole('button', { name: 'Weiter' }));
    await user.press(screen.getByRole('button', { name: 'Fertig' }));
    expect(await screen.findByText('Einstellungen')).toBeOnTheScreen();
  });

  it('lets nobody past the age gate through the introduction', async () => {
    const user = userEvent.setup();
    const router = await renderRouter(APP_DIR, { initialUrl: '/intro' });
    await user.press(await screen.findByRole('button', { name: 'Überspringen' }));
    expect(await screen.findByText('Bist du 18 oder älter?')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/age-gate');
  });
});
