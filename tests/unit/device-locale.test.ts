import { getLocales } from 'expo-localization';

import { detectDeviceLocale } from '@/i18n/deviceLocale';
import { initialSettings, useSettingsStore } from '@/store';

import { resetStores } from '../helpers/stores';

const mockedLocales = getLocales as jest.MockedFunction<typeof getLocales>;
const germanDevice = mockedLocales.getMockImplementation()!;

/** Pretends the device lists these preferred languages, in this order. */
function device(...codes: (string | null)[]) {
  mockedLocales.mockImplementation(
    () =>
      codes.map((languageCode) => ({ languageCode, languageTag: languageCode ?? 'und' })) as unknown as ReturnType<
        typeof getLocales
      >,
  );
}

describe('language of a fresh install', () => {
  beforeEach(() => resetStores());
  afterEach(() => mockedLocales.mockImplementation(germanDevice));

  it('takes the first device language the app speaks', () => {
    device('es');
    expect(detectDeviceLocale()).toBe('es');
    device('fr', 'de', 'en');
    expect(detectDeviceLocale()).toBe('de');
    device('EN');
    expect(detectDeviceLocale()).toBe('en');
  });

  it('falls back to English for other languages and to German when the device cannot tell', () => {
    device('fr', 'it');
    expect(detectDeviceLocale()).toBe('en');
    device(null);
    expect(detectDeviceLocale()).toBe('en');
    mockedLocales.mockImplementation(() => {
      throw new Error('Cannot find native module ExpoLocalization');
    });
    expect(detectDeviceLocale()).toBe('de');
  });

  it('starts a fresh install – and the app after "delete all data" – in the device language', () => {
    device('es', 'en');
    expect(initialSettings()).toMatchObject({ locale: 'es', ageConfirmedAt: null, soundEnabled: true });
    useSettingsStore.getState().setLocale('de');
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().locale).toBe('es');
  });
});
