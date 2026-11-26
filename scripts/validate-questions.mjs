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
  {
    mode: 'most-likely',
    dir: 'src/data/questions/most-likely',
    idPrefix: (level) => `mlt_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Wer würde am ehesten ',
    endsWith: '?',
  },
  {
    mode: 'truth-or-dare',
    dir: 'src/data/questions/truth-or-dare',
    idPrefix: (level) => `tod_${level}_`,
    minPerLevel: 100,
    placeholders: ['{other}'],
    /** Every card is a truth (question) or a dare (task); both need enough cards. */
    kinds: { truth: { min: 40, endsWith: ['?'] }, dare: { min: 40, endsWith: ['.', '!'] } },
    /** Dares that touch another player must ask for consent in the text. */
    consent: true,
  },
  {
    mode: 'random-challenges',
    dir: 'src/data/questions/random-challenges',
    idPrefix: (level) => `rc_${level}_`,
    minPerLevel: 100,
    placeholders: ['{other}'],
    endsWithAny: ['.', '!'],
    /** Challenges with body contact involving others (incl. "Alle: …") need an opt-in. */
    consent: 'others',
    /** Group challenges must not rank players by their looks. */
    noLooksRanking: true,
  },
];

/** Physical contact with another player … */
const TOUCH = /(küss|kuss|massier|umarm|schoß|streich|berühr|hand|nacken|schulter|ohr|kuschel|knabber|lippen|knie|hals|tanz)/i;
/** … must come with an explicit opt-in for that player. */
const CONSENT = /(nur wenn|wenn \{other\}|wenn ihr beide|nur bei einem klaren ja|nur mit|einverstanden|zustimm|erlaubnis|darf|entscheid|wollt|möchte|mag|lust|reicht|letzte wort|ablehnen|ohne berührung)/i;
/** Body contact (stricter list for challenges, where dancing alone is common). */
const CONTACT = /(küss|kuss auf|einen kuss|massier|massage|umarm|im arm|schoß|streichel|berühr|nacken|schulter|kuschel|knabber|lippen|hals|puls|herzschlag|fütter|polonaise|wange an wange|slow dance|tango|tanzt .*eng|eng mit|verbundenen augen|augen verbinden|hand reich|die hand von|hand aufs herz|ins ohr|am ohr)/i;
const OPT_IN = new RegExp(`${CONSENT.source}|freiwillig|wollen|will|mitmachen`, 'i');
/** Group votes must never rank real players by their looks or sex appeal. */
const LOOKS_RANKING = /(am besten aussieht|besten aussehen|heißeste ausstrahlung|attraktivst|hübschest|schönste[nrs]? (körper|gesicht|augen|po|figur)|sexiest(e|en) (person|spieler))/i;
const involvesOthers = (text) =>
  text.includes('{other}') || text.startsWith('Alle:') || /\b(person|personen|jemand|jemanden)\b/i.test(text);

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
      if (deck.endsWith && !q.text.endsWith(deck.endsWith)) {
        errors.push(`${where}: text must end with "${deck.endsWith}"`);
      }
      if (deck.endsWithAny && !deck.endsWithAny.some((end) => q.text.endsWith(end))) {
        errors.push(`${where}: text must end with ${deck.endsWithAny.join(' or ')}`);
      }
      if (q.seconds !== undefined && !(Number.isInteger(q.seconds) && q.seconds >= 5 && q.seconds <= 120)) {
        errors.push(`${where}: seconds must be a whole number between 5 and 120`);
      }
      if (deck.noLooksRanking && LOOKS_RANKING.test(q.text)) {
        errors.push(`${where}: ranks players by their looks – rephrase around behaviour instead`);
      }
      if (deck.consent === 'others' && involvesOthers(q.text) && CONTACT.test(q.text) && !OPT_IN.test(q.text)) {
        errors.push(`${where}: challenge involves body contact with others but does not ask for consent`);
      }
      if (deck.kinds) {
        const rule = deck.kinds[q.kind];
        if (!rule) {
          errors.push(`${where}: kind must be one of ${Object.keys(deck.kinds).join(', ')}`);
        } else if (!rule.endsWith.some((end) => q.text.endsWith(end))) {
          errors.push(`${where}: a ${q.kind} must end with ${rule.endsWith.join(' or ')}`);
        }
      } else if (q.kind !== undefined) {
        errors.push(`${where}: "kind" is only allowed in decks with truth/dare cards`);
      }
      if (deck.consent && q.kind === 'dare' && q.text.includes('{other}') && TOUCH.test(q.text) && !CONSENT.test(q.text)) {
        errors.push(`${where}: dare involves another player physically but does not ask for consent`);
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
    if (deck.kinds) {
      for (const [kind, rule] of Object.entries(deck.kinds)) {
        const count = data.filter((q) => q.kind === kind).length;
        if (count < rule.min) errors.push(`${name}: only ${count} "${kind}" cards (minimum ${rule.min})`);
      }
    }
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
