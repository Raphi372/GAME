/**
 * Shared helpers for screenshots of the web build (store images and README images).
 *
 * Every screenshot starts from a fixed state that is written to the browser storage before
 * the page loads – the same format the app's persisted stores use – so the images always
 * show the same, hand-picked cards instead of a random draw.
 *
 * Needs Playwright with Chromium (`npm i --no-save playwright && npx playwright install
 * chromium` on a normal machine).
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
};

/** Serves the exported web build on 127.0.0.1 with a single-page-app fallback. */
export function serveBuild(distDir, port) {
  const dir = resolve(distDir);
  return createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dir, urlPath);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  }).listen(port, '127.0.0.1');
}

/** Players with the stable ids p0, p1, … in the given order. */
export function makePlayers(names) {
  return names.map((name, colorIndex) => ({ id: `p${colorIndex}`, name, colorIndex }));
}

/**
 * A running game as the app stores it. `card` is the card on the table; `null` means the
 * active player still chooses truth or dare. Without `round` it is an endless single-mode
 * round.
 */
export function makeSession({
  players,
  modeId,
  level,
  card,
  kind,
  playerId = 'p0',
  round,
  dealtByMode = {},
  turnsCompleted = 0,
  stats = {},
  startedAt = Date.now(),
}) {
  return {
    id: 'screenshot',
    modeId,
    level,
    round: round ?? { length: null, modeIds: [modeId], escalate: false, peak: level },
    dealtByMode,
    startedAt,
    playedByLevel: { mild: [], hot: [], extreme: [], [level]: card ? [card] : [] },
    turnCounts: Object.fromEntries(players.map((player) => [player.id, 0])),
    lastPlayerId: null,
    current: {
      playerId,
      questionId: card,
      targetPlayerId: null,
      ...(card ? (kind ? { kind } : {}) : { kind: null }),
    },
    turnsCompleted,
    stats,
  };
}

/** Browser storage of the app: settings and game, in the format of the persisted stores. */
export function appStorage({
  locale = 'de',
  ageConfirmedAt = Date.now(),
  players = [],
  session = null,
  lastLevel = 'mild',
  lastRound,
}) {
  return {
    'spicy-night/settings': JSON.stringify({
      state: { soundEnabled: false, hapticsEnabled: false, animationsEnabled: false, locale, ageConfirmedAt },
      version: 1,
    }),
    'spicy-night/game': JSON.stringify({
      state: { players, session, lastLevel, ...(lastRound ? { lastRound } : {}) },
      version: 1,
    }),
  };
}

/**
 * Opens `url` in a fresh browser context whose storage is seeded once (reloads inside the
 * context keep what the app wrote). Returns the page and a function to close the context.
 */
export async function openScreen(browser, { url, viewport, scale, storage }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  await context.addInitScript((items) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
    sessionStorage.setItem('seeded', '1');
  }, storage);
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  return { page, close: () => context.close() };
}

/** Scrolls every scroll area of the page to its end (React Native Web scroll views are divs). */
export async function scrollToEnd(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('div')) {
      const { overflowY } = getComputedStyle(element);
      if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
        element.scrollTop = element.scrollHeight;
      }
    }
  });
  await page.waitForTimeout(400);
}
