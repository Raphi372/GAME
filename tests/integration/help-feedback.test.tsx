import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, within } from 'expo-router/testing-library';
import { Linking, Platform } from 'react-native';

import { SUPPORT } from '@/config/support';
import { useSettingsStore } from '@/store';

import { flushPromises, resetStores } from '../helpers/stores';

const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

describe('help and feedback in the settings', () => {
  let openURL: jest.SpyInstance;

  beforeEach(async () => {
    await resetStores();
    useSettingsStore.getState().confirmAge();
    // React Native's test setup already makes openURL a mock – spyOn hands back that same
    // function, so its calls and queued results are reset here for every test.
    openURL = jest.spyOn(Linking, 'openURL');
    openURL.mockReset().mockResolvedValue(undefined);
  });

  // Also puts the addresses back (jest.replaceProperty), so every test starts unconfigured.
  afterEach(() => jest.restoreAllMocks());

  const configure = () => {
    jest.replaceProperty(SUPPORT, 'websiteUrl', 'https://spicynight.example');
    jest.replaceProperty(SUPPORT, 'email', 'hallo@example.com');
  };

  it('are not offered until the website and the contact e-mail are filled in', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(await screen.findByRole('button', { name: 'Über SPICY NIGHT' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Hilfe & Kontakt' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Feedback senden' })).not.toBeOnTheScreen();
  });

  it('open the help page of the website in the app language', async () => {
    configure();
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Hilfe & Kontakt' }));
    expect(openURL).toHaveBeenCalledWith('https://spicynight.example/de/support/');
  });

  it('prepare an e-mail with version, system and language – sent only by the player', async () => {
    configure();
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue('18.1');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Feedback senden' }));
    expect(openURL).toHaveBeenCalledTimes(1);
    const url = openURL.mock.calls[0]![0] as string;
    expect(url.startsWith('mailto:hallo@example.com?subject=SPICY%20NIGHT%20%E2%80%93%20Feedback&body=')).toBe(true);
    const body = decodeURIComponent(url.split('&body=')[1]!);
    expect(body).toContain('App-Version: 1.0.0');
    expect(body).toContain('System: iOS 18.1');
    expect(body).toContain('Sprache: Deutsch');
  });

  it('show the address to copy when no mail app or browser answers', async () => {
    configure();
    openURL.mockRejectedValueOnce(new Error('no mail app'));
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Feedback senden' }));
    await flushPromises();
    let sheet = await screen.findByTestId('contact-fallback');
    expect(within(sheet).getByRole('heading', { name: 'Kein E-Mail-Programm gefunden' })).toBeOnTheScreen();
    expect(within(sheet).getByText('hallo@example.com')).toBeOnTheScreen();
    await user.press(within(sheet).getByRole('button', { name: 'OK' }));
    expect(screen.queryByTestId('contact-fallback')).not.toBeOnTheScreen();

    openURL.mockRejectedValueOnce(new Error('no browser'));
    await user.press(screen.getByRole('button', { name: 'Hilfe & Kontakt' }));
    await flushPromises();
    sheet = await screen.findByTestId('contact-fallback');
    expect(within(sheet).getByRole('heading', { name: 'Die Website lässt sich nicht öffnen' })).toBeOnTheScreen();
    expect(within(sheet).getByText('https://spicynight.example/de/support/')).toBeOnTheScreen();
    expect(within(sheet).queryByText('hallo@example.com')).not.toBeOnTheScreen();
  });

  it('speak the app language in the e-mail', async () => {
    configure();
    useSettingsStore.getState().setLocale('es');
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });

    await user.press(await screen.findByRole('button', { name: 'Ayuda y contacto' }));
    expect(openURL).toHaveBeenLastCalledWith('https://spicynight.example/es/support/');
    await user.press(screen.getByRole('button', { name: 'Enviar comentarios' }));
    const url = openURL.mock.calls.at(-1)![0] as string;
    expect(url).toContain('subject=SPICY%20NIGHT%20%E2%80%93%20Comentarios');
    expect(decodeURIComponent(url.split('&body=')[1]!)).toContain('Idioma: Español');
  });
});
