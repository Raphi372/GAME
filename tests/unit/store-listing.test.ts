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

const LOCALES: { store: 'de-DE' | 'en-US'; app: Locale }[] = [
  { store: 'de-DE', app: 'de' },
  { store: 'en-US', app: 'en' },
];

const apple = storeConfig.apple.info;

function play(locale: string, file: 'title' | 'short_description' | 'full_description'): string {
  return readFileSync(join(STORE_DIR, 'google-play', locale, `${file}.txt`), 'utf8').trim();
}

function allTexts(locale: 'de-DE' | 'en-US'): string[] {
  const info = apple[locale];
  return [
    info.title,
    info.subtitle,
    info.promoText,
    info.description,
    info.keywords.join(','),
    play(locale, 'title'),
    play(locale, 'short_description'),
    play(locale, 'full_description'),
  ];
}

/**
 * Sexual keywords in a listing break Google Play's policy, and the game itself never
 * asks anybody to drink – so neither belongs in the store texts.
 */
const BANNED =
  /\b(sex\w*|nackt\w*|naked|nud(e|es|ity)|porn\w*|xxx|eroti\w*|dirty|kinky|hookup|fetis\w*|fetish\w*|strip\w*|nsfw|trinkspiel\w*|saufspiel\w*|drinking games?|shots?)\b/i;

describe('store listing', () => {
  it('has App Store texts for German and English', () => {
    expect(Object.keys(apple).sort()).toEqual(['de-DE', 'en-US']);
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

  it.each(LOCALES)('Google Play texts stay within Google’s limits ($store)', ({ store }) => {
    expect(play(store, 'title').length).toBeLessThanOrEqual(30);
    expect(play(store, 'short_description').length).toBeLessThanOrEqual(80);
    expect(play(store, 'full_description').length).toBeLessThanOrEqual(4000);
  });

  it.each(LOCALES)('both stores show the same description ($store)', ({ store }) => {
    expect(play(store, 'full_description')).toBe(apple[store].description);
  });

  it.each(LOCALES)('contains no sexual or drinking keywords ($store)', ({ store }) => {
    for (const text of allTexts(store)) {
      expect(text).not.toMatch(BANNED);
    }
  });

  it.each(LOCALES)('states the age limit and the fair-play rules ($store)', ({ store }) => {
    const { description } = apple[store];
    expect(description).toMatch(/\b18\b/);
    expect(description).toMatch(store === 'de-DE' ? /„Ich passe“ ist immer erlaubt/ : /“I pass” is always allowed/);
    expect(description).toMatch(store === 'de-DE' ? /Kein Alkohol nötig/ : /No alcohol needed/);
  });

  it.each(LOCALES)('numbers in the texts match the app ($store)', ({ store, app }) => {
    const cards = countBuiltInCards(listPlayableModeIds(), app);
    for (const text of allTexts(store)) {
      for (const match of text.matchAll(/(\d+) (Karten|cards)\b/g)) {
        expect(Number(match[1])).toBe(cards);
      }
      for (const match of text.matchAll(/(\d+) (bis|to) (\d+) (Spieler|players)\b/g)) {
        expect([Number(match[1]), Number(match[3])]).toEqual([MIN_PLAYERS, MAX_PLAYERS]);
      }
      for (const match of text.matchAll(/(\d+) (Modi|modes)\b/g)) {
        expect(Number(match[1])).toBe(listPlayableModeIds().length);
      }
    }
    // The long descriptions spell the number of modes out ("FÜNF SPIELMODI" / "FIVE GAME MODES").
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
    for (const locale of ['de', 'en']) {
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
