#!/usr/bin/env node
/**
 * Preflight before a store submission: lists what is still missing in the repository
 * (provider details, store URLs, EAS project, changelog …).
 *
 *   npm run release:check
 *
 * Exits with 1 while a blocking item is open. Code quality is checked separately with
 * `npm run check` and `npx expo-doctor`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

const app = json('app.json').expo;
const store = json('store.config.json');
const legal = read('src/config/legal.ts');
const changelog = existsSync(join(root, 'CHANGELOG.md')) ? read('CHANGELOG.md') : '';

/** Blocking: the stores would reject the app or the app would ship with placeholders. */
const blocking = [
  {
    ok: !/providerContact:\s*null/.test(legal),
    text: 'Anbieterdaten in src/config/legal.ts eintragen (providerContact) – sonst zeigt der Datenschutz-Bildschirm einen Vorlagen-Hinweis',
  },
  {
    ok: Boolean(app.extra?.eas?.projectId),
    text: 'EAS-Projekt verknüpfen: npx eas-cli@latest init (schreibt extra.eas.projectId in app.json)',
  },
  {
    ok: Boolean(store.apple?.copyright),
    text: 'store.config.json: apple.copyright eintragen (z. B. "2026 Deine Firma")',
  },
  ...Object.entries(store.apple?.info ?? {}).flatMap(([locale, info]) => [
    { ok: Boolean(info.privacyPolicyUrl), text: `store.config.json: privacyPolicyUrl für ${locale} eintragen` },
    { ok: Boolean(info.supportUrl), text: `store.config.json: supportUrl für ${locale} eintragen` },
  ]),
  {
    ok: changelog.includes(`## [${app.version}]`),
    text: `CHANGELOG.md: Abschnitt für Version ${app.version} anlegen`,
  },
];

/** Worth a second look, but not necessarily wrong. */
const warnings = [
  {
    ok: app.ios?.bundleIdentifier !== 'com.spicynight.app' && app.android?.package !== 'com.spicynight.app',
    text: 'Bundle-ID / Paketname ist noch der Platzhalter com.spicynight.app – nach dem ersten Upload nicht mehr änderbar',
  },
  {
    ok: !/unveröffentlicht/i.test(changelog.split('\n## ')[1] ?? ''),
    text: 'CHANGELOG.md: neueste Version ist noch als „unveröffentlicht“ markiert – Datum eintragen',
  },
];

const line = ({ ok, text }, mark) => `${ok ? '✓' : mark} ${text}`;
const openBlocking = blocking.filter((item) => !item.ok);
const openWarnings = warnings.filter((item) => !item.ok);

console.log(`SPICY NIGHT ${app.version} – Release-Vorabprüfung\n`);
for (const item of openBlocking) console.log(line(item, '✗'));
for (const item of openWarnings) console.log(line(item, '⚠'));
const done = [...blocking, ...warnings].filter((item) => item.ok).length;
console.log(`\n${done} erledigt, ${openBlocking.length} offen, ${openWarnings.length} Hinweis(e).`);
if (openBlocking.length === 0) console.log('Bereit für npm run check, den Build und die Einreichung.');
console.log('Alles Weitere (Konten, Fragebögen, Screenshots): docs/RELEASE.md');
process.exit(openBlocking.length > 0 ? 1 : 0);
