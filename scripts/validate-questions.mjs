#!/usr/bin/env node
/**
 * Validates the question database (src/data/questions/*.json).
 * Used by CI and when adding new questions:  npm run validate:questions
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
const MIN_PER_LEVEL = 100;
const ALLOWED_PLACEHOLDERS = ['{other}'];

const errors = [];
const ids = new Set();
const texts = new Map();
const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

for (const level of LEVELS) {
  const file = join(root, 'src', 'data', 'questions', `${level}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${level}.json: cannot be parsed (${error.message})`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${level}.json: must contain an array`);
    continue;
  }
  if (data.length < MIN_PER_LEVEL) {
    errors.push(`${level}.json: only ${data.length} questions (minimum ${MIN_PER_LEVEL})`);
  }
  data.forEach((q, index) => {
    const where = `${level}.json[${index}]`;
    if (typeof q.id !== 'string' || !q.id.startsWith(`${level}_`)) errors.push(`${where}: invalid id "${q.id}"`);
    if (ids.has(q.id)) errors.push(`${where}: duplicate id "${q.id}"`);
    ids.add(q.id);
    if (q.level !== level) errors.push(`${where}: level "${q.level}" does not match file`);
    if (!CATEGORIES.includes(q.category)) errors.push(`${where}: unknown category "${q.category}"`);
    if (q.intensity !== undefined && ![1, 2, 3].includes(q.intensity)) errors.push(`${where}: invalid intensity`);
    if (typeof q.text !== 'string' || q.text.trim().length < 10) {
      errors.push(`${where}: text missing or too short`);
      return;
    }
    if (q.text.length > 180) errors.push(`${where}: text longer than 180 characters`);
    for (const placeholder of q.text.match(/\{[^}]*\}/g) ?? []) {
      if (!ALLOWED_PLACEHOLDERS.includes(placeholder)) errors.push(`${where}: unknown placeholder ${placeholder}`);
    }
    const key = normalize(q.text);
    if (texts.has(key)) errors.push(`${where}: duplicate text (also ${texts.get(key)})`);
    texts.set(key, where);
  });
  console.log(`✓ ${level}: ${data.length} questions`);
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} problem(s) found:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`\nAll ${ids.size} questions are valid.`);
