#!/usr/bin/env node
/**
 * Validates all question decks (src/data/questions/**).
 * Used by CI and when adding new content:  npm run validate:questions
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['mild', 'hot', 'extreme'];
const CATEGORIES = [
  'flirty', 'dating', 'confession', 'group', 'personal',
  'funny', 'romance', 'desire', 'secrets', 'hypothetical',
];

/** One entry per game mode that ships content. */
const DECKS = [
  {
    mode: 'spicy-questions',
    dir: 'src/data/questions',
    idPrefix: (level) => `${level}_`,
    minPerLevel: 100,
    placeholders: ['{other}'],
  },
  {
    mode: 'never-have-i-ever',
    dir: 'src/data/questions/never-have-i-ever',
    idPrefix: (level) => `nhie_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Ich hab noch nie ',
  },
];

const errors = [];
const ids = new Set();
const texts = new Map();
const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let total = 0;

for (const deck of DECKS) {
  for (const level of LEVELS) {
    const name = `${deck.dir}/${level}.json`;
    const file = join(root, deck.dir, `${level}.json`);
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      errors.push(`${name}: cannot be read or parsed (${error.message})`);
      continue;
    }
    if (!Array.isArray(data)) {
      errors.push(`${name}: must contain an array`);
      continue;
    }
    if (data.length < deck.minPerLevel) {
      errors.push(`${name}: only ${data.length} entries (minimum ${deck.minPerLevel})`);
    }
    data.forEach((q, index) => {
      const where = `${name}[${index}]`;
      if (typeof q.id !== 'string' || !q.id.startsWith(deck.idPrefix(level))) {
        errors.push(`${where}: invalid id "${q.id}" (expected prefix ${deck.idPrefix(level)})`);
      }
      if (ids.has(q.id)) errors.push(`${where}: duplicate id "${q.id}"`);
      ids.add(q.id);
      if (q.level !== level) errors.push(`${where}: level "${q.level}" does not match file`);
      if (!CATEGORIES.includes(q.category)) errors.push(`${where}: unknown category "${q.category}"`);
      if (q.intensity !== undefined && ![1, 2, 3].includes(q.intensity)) {
        errors.push(`${where}: invalid intensity`);
      }
      if (typeof q.text !== 'string' || q.text.trim().length < 10) {
        errors.push(`${where}: text missing or too short`);
        return;
      }
      if (q.text.length > 180) errors.push(`${where}: text longer than 180 characters`);
      if (deck.startsWith && !q.text.startsWith(deck.startsWith)) {
        errors.push(`${where}: text must start with "${deck.startsWith}"`);
      }
      for (const placeholder of q.text.match(/\{[^}]*\}/g) ?? []) {
        if (!deck.placeholders.includes(placeholder)) {
          errors.push(`${where}: placeholder ${placeholder} not allowed in ${deck.mode}`);
        }
      }
      const key = normalize(q.text);
      if (texts.has(key)) errors.push(`${where}: duplicate text (also ${texts.get(key)})`);
      texts.set(key, where);
    });
    total += data.length;
    console.log(`✓ ${deck.mode} / ${level}: ${data.length}`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} problem(s) found:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`\nAll ${total} cards are valid.`);
