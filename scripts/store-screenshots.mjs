#!/usr/bin/env node
/**
 * Store screenshots and Google Play graphics from the web build.
 *
 *   npx expo export --platform web --output-dir dist
 *   node scripts/store-screenshots.mjs dist docs/store
 *
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
 * on a normal machine). Every screenshot starts from a fixed, hand-picked game state that is
 * written to the browser storage before the page loads – so the store images always show the
 * same harmless cards instead of a random draw.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = resolve(process.argv[2] ?? 'dist');
const outDir = resolve(process.argv[3] ?? 'docs/store');
const PORT = 8790;

/** Exact store sizes: viewport × device scale factor. */
const DEVICES = [
  { id: 'ios-6.9', width: 440, height: 956, scale: 3 }, // 1320 × 2868 (App Store iPhone 6.9")
  { id: 'ipad-13', width: 1032, height: 1376, scale: 2 }, // 2064 × 2752 (App Store iPad 13")
  { id: 'android-phone', width: 360, height: 780, scale: 3 }, // 1080 × 2340 (Google Play, ratio ≤ 2.3)
];

const PLAYERS = {
  de: ['Lena', 'Max', 'Sophie', 'Jonas'],
  en: ['Emma', 'Noah', 'Mia', 'Leo'],
};

/** One entry per screenshot: route plus the game state it starts from. */
const SHOTS = [
  { name: '01-home', path: '/', session: null },
  { name: '02-levels', path: '/level?mode=spicy-questions', session: null, lastLevel: 'hot' },
  { name: '03-spicy-questions', path: '/game', session: { modeId: 'spicy-questions', level: 'mild', card: 'mild_019' } },
  { name: '04-truth-or-dare', path: '/game', session: { modeId: 'truth-or-dare', level: 'mild', card: null } },
  { name: '05-never-have-i-ever', path: '/game', session: { modeId: 'never-have-i-ever', level: 'mild', card: 'nhie_mild_070' } },
  { name: '06-random-challenges', path: '/game', session: { modeId: 'random-challenges', level: 'mild', card: 'rc_mild_020' } },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.wav': 'audio/wav' };

/** Minimal static server with single-page-app fallback. */
function serve(dir) {
  return createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dir, urlPath);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  }).listen(PORT, '127.0.0.1');
}

function storage(locale, shot) {
  const now = Date.now();
  const names = PLAYERS[locale];
  const players = names.map((name, colorIndex) => ({ id: `p${colorIndex}`, name, colorIndex }));
  const s = shot.session;
  const session = s && {
    id: 'store-shot',
    modeId: s.modeId,
    level: s.level,
    startedAt: now,
    playedByLevel: { mild: s.card ? [s.card] : [], hot: [], extreme: [] },
    turnCounts: Object.fromEntries(players.map((p) => [p.id, 0])),
    lastPlayerId: null,
    current: { playerId: 'p0', questionId: s.card, targetPlayerId: null, ...(s.card ? {} : { kind: null }) },
    turnsCompleted: 0,
    stats: {},
  };
  return {
    'spicy-night/settings': JSON.stringify({
      state: { soundEnabled: false, hapticsEnabled: false, animationsEnabled: false, locale, ageConfirmedAt: now },
      version: 1,
    }),
    'spicy-night/game': JSON.stringify({
      state: { players, session, lastLevel: shot.lastLevel ?? s?.level ?? 'mild' },
      version: 1,
    }),
  };
}

async function screenshots(browser) {
  for (const device of DEVICES) {
    for (const locale of ['de', 'en']) {
      const dir = join(outDir, 'screenshots', device.id, locale);
      mkdirSync(dir, { recursive: true });
      for (const shot of SHOTS) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.scale,
          reducedMotion: 'reduce',
        });
        await context.addInitScript((items) => {
          if (sessionStorage.getItem('seeded')) return;
          localStorage.clear();
          for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
          sessionStorage.setItem('seeded', '1');
        }, storage(locale, shot));
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${PORT}${shot.path}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const file = join(dir, `${shot.name}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
        console.log(`✓ ${device.id}/${locale}/${shot.name}.jpg`);
        await context.close();
      }
    }
  }
}

/** Google Play feature graphic (1024 × 500, no alpha → JPEG). */
async function featureGraphic(browser) {
  // Inline the fonts: a page set via setContent() runs on about:blank and may not load file:// URLs.
  const font = (path) =>
    `data:font/ttf;base64,${readFileSync(join(root, 'node_modules/@expo-google-fonts', path)).toString('base64')}`;
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Unbounded; font-weight: 900; src: url('${font('unbounded/900Black/Unbounded_900Black.ttf')}'); }
    @font-face { font-family: Manrope; font-weight: 600; src: url('${font('manrope/600SemiBold/Manrope_600SemiBold.ttf')}'); }
    html, body { margin: 0; width: 1024px; height: 500px; overflow: hidden; }
    body { background: #07050B; display: flex; align-items: center; justify-content: center; position: relative; }
    .glow { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .55; }
    .a { width: 520px; height: 420px; background: #B14DFF; left: -120px; top: -140px; }
    .b { width: 520px; height: 420px; background: #FF3D9A; right: -140px; bottom: -180px; }
    .logo { position: relative; text-align: center; }
    .word { font-family: Unbounded; font-weight: 900; font-size: 112px; line-height: 1; letter-spacing: 6px; color: #F7F2FF; }
    .night { background: linear-gradient(90deg, #E040FB, #FF3D9A); -webkit-background-clip: text; color: transparent; }
    .tag { margin-top: 28px; font-family: Manrope; font-weight: 600; font-size: 30px; color: #D4A8FF; letter-spacing: 1px; }
  </style></head><body>
    <div class="glow a"></div><div class="glow b"></div>
    <div class="logo"><div class="word">SPICY</div><div class="word night">NIGHT</div><div class="tag">The party gets hotter. 🌶️</div></div>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].map((face) => `${face.family}:${face.status}`));
  if (fonts.length !== 2 || fonts.some((entry) => !entry.endsWith(':loaded'))) {
    throw new Error(`Feature graphic: fonts not loaded (${fonts.join(', ')})`);
  }
  const dir = join(outDir, 'google-play');
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, 'feature-graphic.jpg'), type: 'jpeg', quality: 92 });
  console.log('✓ google-play/feature-graphic.jpg');
  await page.close();
}

const server = serve(distDir);
const browser = await chromium.launch();
try {
  await screenshots(browser);
  await featureGraphic(browser);
} finally {
  await browser.close();
  server.close();
}
