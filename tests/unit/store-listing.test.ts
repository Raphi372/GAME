import { listPlayableModeIds, MAX_PLAYERS, MIN_PLAYERS } from '@/features/game-modes/registry';
import { countBuiltInCards } from '@/features/question-decks';
import type { Locale } from '@/types';

import storeConfig from '../../store.config.json';

/**
 * Store listing (App Store via EAS Metadata, Google Play as text files): limits of both
 * stores, wording that would get the listing rejected, and facts that must match the app.
 */
/*
 * The files are read with Node's `fs` through a small local type, so the project's type
 * check stays limited to Jest and React Native globals (no global Node types in app code).
 */
declare const __dirname: string;
interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string): Uint8Array;
  readFileSync(path: string, encoding: 'utf8'): string;
}
const { existsSync, readFileSync } = jest.requireActual<FileSystem>('fs');
const join = (...parts: string[]) => parts.join('/');

const STORE_DIR = join(__dirname, '../../docs/store');

type AppleLocale = keyof typeof storeConfig.apple.info;

/**
 * One App Store and one Google Play listing per app language. Spanish gets two of each –
 * Spain and Latin America (App Store: es-MX, Google Play: es-419) – with the same neutral text.
 */
const LOCALES: { store: AppleLocale; play: string; app: Locale }[] = [
  { store: 'de-DE', play: 'de-DE', app: 'de' },
  { store: 'en-US', play: 'en-US', app: 'en' },
  { store: 'es-ES', play: 'es-ES', app: 'es' },
  { store: 'es-MX', play: 'es-419', app: 'es' },
];

const apple = storeConfig.apple.info;

function play(locale: string, file: 'title' | 'short_description' | 'full_description'): string {
  return readFileSync(join(STORE_DIR, 'google-play', locale, `${file}.txt`), 'utf8').trim();
}

function allTexts({ store, play: playLocale }: (typeof LOCALES)[number]): string[] {
  const info = apple[store];
  return [
    info.title,
    info.subtitle,
    info.promoText,
    info.description,
    info.keywords.join(','),
    play(playLocale, 'title'),
    play(playLocale, 'short_description'),
    play(playLocale, 'full_description'),
  ];
}

/** The fair-play promises every description has to make, in its language. */
const FAIR_PLAY: Record<Locale, RegExp[]> = {
  de: [/„Ich passe“ ist immer erlaubt/, /Kein Alkohol nötig/],
  en: [/“I pass” is always allowed/, /No alcohol needed/],
  es: [/“Paso” siempre está permitido/, /No hace falta alcohol/],
};

/**
 * Sexual keywords in a listing break Google Play's policy, and the game itself never
 * asks anybody to drink – so neither belongs in the store texts.
 */
const BANNED =
  /\b(sex\w*|nackt\w*|naked|nud(e|es|ity)|porn\w*|xxx|eroti\w*|eróti\w*|desnud\w*|dirty|kinky|hookup|fetis\w*|fetish\w*|fetich\w*|strip\w*|nsfw|trinkspiel\w*|saufspiel\w*|drinking games?|juegos? (de|para) beber|shots?|chupitos?|tragos?)\b/i;

describe('store listing', () => {
  it('has App Store texts for German, English and Spanish', () => {
    expect(Object.keys(apple).sort()).toEqual(['de-DE', 'en-US', 'es-ES', 'es-MX']);
  });

  it('uses the same neutral Spanish texts for Spain and Latin America', () => {
    expect(apple['es-MX']).toEqual(apple['es-ES']);
    for (const file of ['title', 'short_description', 'full_description'] as const) {
      expect(play('es-419', file)).toBe(play('es-ES', file));
    }
  });

  it.each(LOCALES)('App Store texts stay within Apple’s limits ($store)', ({ store }) => {
    const info = apple[store];
    expect(info.title.length).toBeGreaterThanOrEqual(2);
    expect(info.title.length).toBeLessThanOrEqual(30);
    expect(info.subtitle.length).toBeLessThanOrEqual(30);
    expect(info.promoText.length).toBeLessThanOrEqual(170);
    expect(info.description.length).toBeGreaterThanOrEqual(10);
    expect(info.description.length).toBeLessThanOrEqual(4000);
    // Apple counts the keywords joined by commas: at most 100 characters.
    expect(info.keywords.join(',').length).toBeLessThanOrEqual(100);
  });

  it.each(LOCALES)('keywords are unique, lowercase and do not repeat the app name ($store)', ({ store }) => {
    const { keywords, title } = apple[store];
    expect(new Set(keywords).size).toBe(keywords.length);
    for (const keyword of keywords) {
      expect(keyword).toBe(keyword.trim().toLowerCase());
      expect(keyword).not.toContain(',');
      expect(title.toLowerCase()).not.toContain(keyword);
    }
  });

  it.each(LOCALES)('Google Play texts stay within Google’s limits ($play)', ({ play: playLocale }) => {
    expect(play(playLocale, 'title').length).toBeLessThanOrEqual(30);
    expect(play(playLocale, 'short_description').length).toBeLessThanOrEqual(80);
    expect(play(playLocale, 'full_description').length).toBeLessThanOrEqual(4000);
  });

  it.each(LOCALES)('both stores show the same description ($store / $play)', ({ store, play: playLocale }) => {
    expect(play(playLocale, 'full_description')).toBe(apple[store].description);
  });

  it.each(LOCALES)('contains no sexual or drinking keywords ($store)', (locale) => {
    for (const text of allTexts(locale)) {
      expect(text).not.toMatch(BANNED);
    }
  });

  it.each(LOCALES)('states the age limit and the fair-play rules ($store)', ({ store, app }) => {
    const { description } = apple[store];
    expect(description).toMatch(/\b18\b/);
    for (const promise of FAIR_PLAY[app]) expect(description).toMatch(promise);
  });

  it.each(LOCALES)('names every language the cards come in ($store)', ({ store }) => {
    expect(apple[store].description).toMatch(
      /Deutsch, Englisch und Spanisch|English, German and Spanish|español, inglés y alemán/,
    );
  });

  it.each(LOCALES)('numbers in the texts match the app ($store)', (locale) => {
    const cards = countBuiltInCards(listPlayableModeIds(), locale.app);
    for (const text of allTexts(locale)) {
      for (const match of text.matchAll(/(\d+) (Karten|cards|cartas)\b/g)) {
        expect(Number(match[1])).toBe(cards);
      }
      for (const match of text.matchAll(/(\d+) (bis|to|a) (\d+) (Spieler|players|jugadores)\b/g)) {
        expect([Number(match[1]), Number(match[3])]).toEqual([MIN_PLAYERS, MAX_PLAYERS]);
      }
      for (const match of text.matchAll(/(\d+) (Modi|modes|modos)\b/g)) {
        expect(Number(match[1])).toBe(listPlayableModeIds().length);
      }
    }
    // The long descriptions spell the number of modes out ("FÜNF SPIELMODI" / "CINCO MODOS DE JUEGO").
    expect(listPlayableModeIds()).toHaveLength(5);
  });
});

/** Reads width and height from a PNG header or a JPEG start-of-frame segment. */
function imageInfo(file: string): { type: 'png' | 'jpeg'; width: number; height: number; alpha: boolean } {
  const data = readFileSync(file);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (String.fromCharCode(...data.subarray(1, 4)) === 'PNG') {
    const colorType = data[25];
    return {
      type: 'png',
      width: view.getUint32(16),
      height: view.getUint32(20),
      alpha: colorType === 4 || colorType === 6,
    };
  }
  let offset = 2;
  while (offset < data.length) {
    const marker = data[offset + 1] ?? 0;
    const length = view.getUint16(offset + 2);
    // SOF0–SOF15 without DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        type: 'jpeg',
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
        alpha: false,
      };
    }
    offset += 2 + length;
  }
  throw new Error(`${file}: no image size found`);
}

describe('store graphics', () => {
  const SIZES = {
    'ios-6.9': [1320, 2868],
    'ipad-13': [2064, 2752],
    'android-phone': [1080, 2340],
  } as const;
  const SHOTS = [
    '01-home',
    '02-levels',
    '03-spicy-questions',
    '04-truth-or-dare',
    '05-never-have-i-ever',
    '06-random-challenges',
  ];

  it.each(Object.entries(SIZES))('screenshots for %s have the exact store size', (device, [width, height]) => {
    for (const locale of ['de', 'en', 'es']) {
      for (const shot of SHOTS) {
        const file = join(STORE_DIR, 'screenshots', device, locale, `${shot}.jpg`);
        expect(existsSync(file)).toBe(true);
        expect(imageInfo(file)).toEqual({ type: 'jpeg', width, height, alpha: false });
      }
    }
  });

  it('Google Play gets a 512 px icon with alpha and a 1024 × 500 feature graphic without', () => {
    expect(imageInfo(join(STORE_DIR, 'google-play/icon-512.png'))).toEqual({
      type: 'png',
      width: 512,
      height: 512,
      alpha: true,
    });
    expect(imageInfo(join(STORE_DIR, 'google-play/feature-graphic.jpg'))).toEqual({
      type: 'jpeg',
      width: 1024,
      height: 500,
      alpha: false,
    });
  });
});
