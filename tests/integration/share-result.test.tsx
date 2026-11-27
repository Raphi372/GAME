import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen, within } from 'expo-router/testing-library';

import * as shareImage from '@/features/share/shareImage';
import { useGameStore, useSettingsStore, type GameResult, type PlayerResult } from '@/store';

import { resetStores } from '../helpers/stores';

const APP_DIR = './src/app';

// The first render loads (and transforms) the whole app – generous timeout for cold CI runners.
jest.setTimeout(60000);

const sharing = jest.requireMock<jest.Mocked<typeof import('expo-sharing')>>('expo-sharing');
const viewShot = jest.requireMock<jest.Mocked<typeof import('react-native-view-shot')>>('react-native-view-shot');

const player = (name: string, colorIndex: number, stats: Partial<PlayerResult> = {}): PlayerResult => ({
  id: `player-${name}`,
  name,
  colorIndex,
  answered: 0,
  passed: 0,
  skipped: 0,
  confessed: 0,
  picked: 0,
  truths: 0,
  dares: 0,
  ...stats,
});

const ROUND: GameResult = {
  modeId: 'spicy-questions',
  mixed: false,
  modeIds: ['spicy-questions'],
  level: 'hot',
  turnsCompleted: 6,
  durationMs: 12 * 60000,
  players: [player('Lena', 0, { answered: 2, passed: 1 }), player('Max', 1, { answered: 3, skipped: 1 })],
};

async function openSummary(result: GameResult = ROUND) {
  useGameStore.setState({ lastResult: result });
  await renderRouter(APP_DIR, { initialUrl: '/summary' });
  return screen.findByRole('button', { name: 'Ergebnis teilen' });
}

const card = () => screen.getByRole('img', { name: /^Vorschau des Bildes:/ });

describe('sharing the result', () => {
  beforeEach(async () => {
    await resetStores();
    jest.clearAllMocks();
    useSettingsStore.getState().confirmAge();
  });

  it('previews the picture without names until the group switches them on', async () => {
    const user = userEvent.setup();
    await user.press(await openSummary());

    expect(screen.getByRole('heading', { name: 'Euer Abend als Bild' })).toBeOnTheScreen();
    expect(
      screen.getByText('Das Bild entsteht nur auf deinem Gerät – wohin es geht, entscheidest du im Teilen-Menü.'),
    ).toBeOnTheScreen();
    expect(card()).toHaveAccessibleName(
      'Vorschau des Bildes: SPICY NIGHT – Was für eine Nacht! Spicy Questions, Hot, 2 Spieler, 12 Min. ' +
        'Runden: 6, Beantwortet: 5, Gepasst: 1, Übersprungen: 1.',
    );
    expect(within(card()).queryByText('Max')).not.toBeOnTheScreen();
    expect(within(card()).getByText('🌶️🌶️ HOT · 2 Spieler · 12 Min.')).toBeOnTheScreen();

    const names = screen.getByRole('switch', { name: 'Namen zeigen' });
    expect(names).not.toBeChecked();
    expect(screen.getByText('Nur, wenn alle in der Runde einverstanden sind.')).toBeOnTheScreen();

    await user.press(names);
    expect(screen.getByRole('switch', { name: 'Namen zeigen' })).toBeChecked();
    expect(within(card()).getByText('Max')).toBeOnTheScreen();
    expect(within(card()).getByText('🏆 Mutigste Person')).toBeOnTheScreen();
    expect(card()).toHaveAccessibleName(/Mutigste Person: Max\.$/);
  });

  it('hands the picture to the share menu and keeps the button busy meanwhile', async () => {
    const user = userEvent.setup();
    let finishShare = () => {};
    sharing.shareAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishShare = resolve;
        }),
    );
    await user.press(await openSummary());
    await user.press(screen.getByRole('button', { name: 'Teilen' }));

    expect(viewShot.captureRef).toHaveBeenCalledTimes(1);
    const [target, options] = viewShot.captureRef.mock.calls[0]!;
    expect(target).toEqual({ current: expect.anything() });
    expect(options).toEqual({ format: 'png', quality: 1, result: 'tmpfile' });
    expect(sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/ReactNative/result.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Ergebnis teilen',
    });
    expect(screen.getByRole('button', { name: 'Bild wird erstellt …' })).toBeDisabled();

    await act(async () => finishShare());
    expect(screen.getByRole('button', { name: 'Teilen' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('reports a failed share and lets the group try again', async () => {
    const user = userEvent.setup();
    viewShot.captureRef.mockRejectedValueOnce(new Error('capture failed'));
    await user.press(await openSummary());

    await user.press(screen.getByRole('button', { name: 'Teilen' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Bild konnte nicht erstellt oder geteilt werden. Versuch es noch einmal.',
    );
    expect(sharing.shareAsync).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Teilen' }));
    expect(sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('hides the names again for the next picture and deletes the picture when the summary closes', async () => {
    const user = userEvent.setup();
    const openButton = await openSummary();
    await user.press(openButton);
    await user.press(screen.getByRole('switch', { name: 'Namen zeigen' }));
    await user.press(screen.getByRole('button', { name: 'Teilen' }));
    await user.press(screen.getByRole('button', { name: 'Fertig' }));

    await user.press(screen.getByRole('button', { name: 'Ergebnis teilen' }));
    expect(screen.getByRole('switch', { name: 'Namen zeigen' })).not.toBeChecked();
    expect(within(card()).queryByText('Max')).not.toBeOnTheScreen();

    expect(viewShot.releaseCapture).not.toHaveBeenCalled();
    await screen.unmount();
    expect(viewShot.releaseCapture).toHaveBeenCalledWith('file:///tmp/ReactNative/result.png');
  });

  it('names everybody who shares the lead', async () => {
    const user = userEvent.setup();
    await user.press(
      await openSummary({
        ...ROUND,
        players: [player('Lena', 0, { answered: 3 }), player('Max', 1, { answered: 3 }), player('Sam', 2)],
      }),
    );
    await user.press(screen.getByRole('switch', { name: 'Namen zeigen' }));
    expect(within(card()).getByText('Lena & Max')).toBeOnTheScreen();
  });

  it('keeps the picture to two rows of numbers in a mixed round', async () => {
    const user = userEvent.setup();
    await user.press(
      await openSummary({
        ...ROUND,
        mixed: true,
        modeIds: ['spicy-questions', 'never-have-i-ever', 'most-likely'],
        players: [player('Lena', 0, { answered: 1, confessed: 2, passed: 1 }), player('Max', 1, { picked: 2 })],
      }),
    );
    // The summary lists all five counters, the picture the first four.
    expect(screen.getAllByTestId('summary-stat')).toHaveLength(5);
    expect(within(card()).getByText('🎉 Gemischte Runde')).toBeOnTheScreen();
    expect(within(card()).getByText('Gewählt')).toBeOnTheScreen();
    expect(within(card()).queryByText('Gepasst')).not.toBeOnTheScreen();
  });

  it('speaks the language of the app', async () => {
    const user = userEvent.setup();
    useSettingsStore.getState().setLocale('es');
    useGameStore.setState({ lastResult: ROUND });
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    await user.press(await screen.findByRole('button', { name: 'Compartir el resultado' }));

    expect(screen.getByRole('heading', { name: 'La noche en una imagen' })).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Mostrar nombres' })).not.toBeChecked();
    expect(screen.getByRole('img', { name: /^Vista previa de la imagen: SPICY NIGHT – ¡Qué noche!/ })).toHaveAccessibleName(
      /2 jugadores, 12 min\./,
    );
    await user.press(screen.getByRole('button', { name: 'Compartir' }));
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dialogTitle: 'Compartir el resultado' }),
    );
  });

  it('offers no sharing where the build cannot create the picture', async () => {
    const supported = jest.spyOn(shareImage, 'canShareResultImage').mockReturnValue(false);
    try {
      useGameStore.setState({ lastResult: ROUND });
      await renderRouter(APP_DIR, { initialUrl: '/summary' });
      expect(await screen.findByText('Was für eine Nacht!')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Ergebnis teilen' })).not.toBeOnTheScreen();
    } finally {
      supported.mockRestore();
    }
  });
});
