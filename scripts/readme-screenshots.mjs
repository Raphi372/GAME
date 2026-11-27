#!/usr/bin/env node
/**
 * README screenshots from the web build (phone window 390 × 844 at 2×, plus one tablet).
 *
 *   npm run docs:screenshots
 *   # = node scripts/readme-screenshots.mjs --build dist docs/screenshots
 *
 * `--build` first exports the web build with `EXPO_PUBLIC_SHARE_PREVIEW=1` – set here, so it
 * works in every shell, Windows included. The variable shows "Ergebnis teilen" in the web build,
 * which normally hides it (no image capture in the browser), so the summary looks like in the
 * apps. Without `--build` the script uses an existing export in the given folder.
 *
 * Needs Playwright with Chromium – see `scripts/lib/app-screens.mjs`. Every scene starts from
 * a fixed game state with hand-picked cards; some then tap through the app (open a sheet,
 * mark players, end the game for the summary).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { appStorage, chromium, makePlayers, makeSession, openScreen, scrollToEnd, serveBuild } from './lib/app-screens.mjs';

const args = process.argv.slice(2);
const [distArg = 'dist', outArg = 'docs/screenshots'] = args.filter((arg) => arg !== '--build');
const distDir = resolve(distArg);
const outDir = resolve(outArg);

if (args.includes('--build')) {
  const exported = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', distArg], {
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_SHARE_PREVIEW: '1' },
    shell: process.platform === 'win32',
  });
  if (exported.status !== 0) process.exit(exported.status ?? 1);
}
const PORT = 8791;

const PHONE = { viewport: { width: 390, height: 844 }, scale: 2 };
const TABLET = { viewport: { width: 1032, height: 1376 }, scale: 1 };

const players = makePlayers(['Lena', 'Max', 'Sophie', 'Jonas']);
const ALL_MODES = ['spicy-questions', 'never-have-i-ever', 'truth-or-dare', 'most-likely', 'random-challenges'];
/** Fixed date, so the settings screen shows the same confirmation date every time. */
const AGE_CONFIRMED = Date.UTC(2026, 10, 20, 18, 0);
const minutesAgo = (minutes) => Date.now() - minutes * 60_000;

const session = (options) => makeSession({ players, ...options });

const mixedGame = session({
  modeId: 'spicy-questions',
  level: 'hot',
  card: 'hot_003',
  playerId: 'p1',
  // Card 5 of an escalating 10-card round: it just turned HOT, and it is the round's first
  // Spicy Questions card – so it shows the level-up and the mode's rule.
  round: { length: 10, modeIds: ALL_MODES, escalate: true, peak: 'extreme' },
  turnsCompleted: 4,
  dealtByMode: { 'spicy-questions': 1, 'never-have-i-ever': 2, 'most-likely': 1, 'truth-or-dare': 1 },
});

async function endGame(page) {
  await page.getByRole('button', { name: 'Spiel beenden' }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Beenden', exact: true }).last().click();
  await page.waitForTimeout(1200);
}

const tap = (...labels) => async (page) => {
  for (const label of labels) {
    await page.getByRole(label.role, { name: label.name, exact: true }).first().click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
};

/** One entry per image: route, stored state and an optional action before the shot. */
const SCENES = [
  { name: '01-age-gate', path: '/', state: { ageConfirmedAt: null } },
  { name: '02-home', path: '/' },
  { name: '03-players', path: '/players?mode=spicy-questions' },
  { name: '04-levels', path: '/level?mode=spicy-questions', state: { lastLevel: 'hot' } },
  {
    name: '05-round-settings',
    path: '/level?mode=spicy-questions',
    state: { lastLevel: 'hot', lastRound: { length: 20, escalate: true, mixModeIds: ALL_MODES } },
    act: scrollToEnd,
  },
  {
    name: '06-game',
    path: '/game',
    state: {
      session: session({
        modeId: 'spicy-questions',
        level: 'hot',
        card: 'hot_010',
        round: { length: 20, modeIds: ['spicy-questions'], escalate: false, peak: 'hot' },
        turnsCompleted: 2,
      }),
    },
  },
  {
    name: '07-level-switch',
    path: '/game',
    state: { session: session({ modeId: 'spicy-questions', level: 'hot', card: 'hot_010' }) },
    act: tap({ role: 'button', name: 'Level: HOT. Tippen zum Wechseln' }),
  },
  {
    name: '08-game-extreme',
    path: '/game',
    state: { session: session({ modeId: 'spicy-questions', level: 'extreme', card: 'extreme_058', playerId: 'p2' }) },
  },
  {
    name: '09-never-have-i-ever',
    path: '/game',
    state: { session: session({ modeId: 'never-have-i-ever', level: 'hot', card: 'nhie_hot_007', playerId: 'p3' }) },
    act: tap(
      { role: 'checkbox', name: 'Max hat es schon getan' },
      { role: 'checkbox', name: 'Lena hat es schon getan' },
    ),
  },
  {
    name: '10-most-likely',
    path: '/game',
    state: { session: session({ modeId: 'most-likely', level: 'mild', card: 'mlt_mild_004', playerId: 'p1' }) },
    act: tap({ role: 'checkbox', name: 'Sophie wurde gewählt' }),
  },
  {
    name: '11-truth-or-dare-choice',
    path: '/game',
    state: { session: session({ modeId: 'truth-or-dare', level: 'mild', card: null, playerId: 'p2' }) },
  },
  {
    name: '12-truth-or-dare-dare',
    path: '/game',
    state: {
      session: session({ modeId: 'truth-or-dare', level: 'mild', card: 'tod_mild_053', kind: 'dare', playerId: 'p2' }),
    },
  },
  {
    name: '13-random-challenges-timer',
    path: '/game',
    state: { session: session({ modeId: 'random-challenges', level: 'mild', card: 'rc_mild_020' }) },
  },
  {
    name: '14-random-challenges-group',
    path: '/game',
    state: { session: session({ modeId: 'random-challenges', level: 'mild', card: 'rc_mild_044', playerId: 'p3' }) },
  },
  {
    name: '15-mixed-round',
    path: '/level?mode=mix',
    state: { lastLevel: 'hot', lastRound: { length: 10, escalate: true, mixModeIds: ALL_MODES } },
  },
  { name: '16-mixed-game', path: '/game', state: { session: mixedGame } },
  {
    name: '17-summary',
    path: '/game',
    state: {
      session: session({
        modeId: 'spicy-questions',
        level: 'hot',
        card: 'hot_001',
        turnsCompleted: 18,
        startedAt: minutesAgo(47),
        stats: {
          p0: { answered: 5, passed: 1, skipped: 1 },
          p1: { answered: 4, passed: 1 },
          p2: { answered: 4, passed: 0, skipped: 1 },
          p3: { answered: 3, passed: 0 },
        },
      }),
    },
    act: endGame,
  },
  {
    name: '18-summary-mixed',
    path: '/game',
    state: {
      session: session({
        modeId: 'spicy-questions',
        level: 'extreme',
        card: 'extreme_039',
        round: { length: 20, modeIds: ALL_MODES, escalate: true, peak: 'extreme' },
        turnsCompleted: 16,
        startedAt: minutesAgo(63),
        stats: {
          p0: { answered: 3, confessed: 2, picked: 1, passed: 0, truths: 1, dares: 1 },
          p1: { answered: 2, confessed: 3, picked: 2, passed: 1, truths: 0, dares: 1 },
          p2: { answered: 3, confessed: 1, picked: 0, passed: 0, truths: 1, dares: 0 },
          p3: { answered: 1, confessed: 2, picked: 1, passed: 1 },
        },
      }),
    },
    act: endGame,
  },
  { name: '19-settings', path: '/settings' },
  { name: '20-tablet', path: '/game', state: { session: mixedGame }, device: TABLET },
  { name: '21-intro', path: '/intro' },
  {
    name: '22-share',
    path: '/game',
    state: {
      session: session({
        modeId: 'spicy-questions',
        level: 'hot',
        card: 'hot_001',
        turnsCompleted: 18,
        startedAt: minutesAgo(47),
        stats: {
          p0: { answered: 5, passed: 1, skipped: 1 },
          p1: { answered: 4, passed: 1 },
          p2: { answered: 4, passed: 0, skipped: 1 },
          p3: { answered: 3, passed: 0 },
        },
      }),
    },
    act: async (page) => {
      await endGame(page);
      await tap({ role: 'button', name: 'Ergebnis teilen' })(page);
    },
  },
];

const server = serveBuild(distDir, PORT);
const browser = await chromium.launch();
try {
  mkdirSync(outDir, { recursive: true });
  for (const scene of SCENES) {
    const device = scene.device ?? PHONE;
    const { page, close } = await openScreen(browser, {
      url: `http://127.0.0.1:${PORT}${scene.path}`,
      viewport: device.viewport,
      scale: device.scale,
      storage: appStorage({ players, ageConfirmedAt: AGE_CONFIRMED, ...scene.state }),
    });
    if (scene.act) await scene.act(page);
    await page.screenshot({ path: join(outDir, `${scene.name}.jpg`), type: 'jpeg', quality: 82 });
    console.log(`✓ ${scene.name}.jpg`);
    await close();
  }
} finally {
  await browser.close();
  server.close();
}
