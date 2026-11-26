#!/usr/bin/env node
/**
 * Validates all question decks (src/data/questions/**) and their English
 * translations (src/data/questions/en/<mode>/<level>.json: { "<id>": "<text>" }).
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
    en: {},
  },
  {
    mode: 'never-have-i-ever',
    dir: 'src/data/questions/never-have-i-ever',
    idPrefix: (level) => `nhie_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Ich hab noch nie ',
    en: { startsWith: 'Never have I ever ' },
  },
  {
    mode: 'most-likely',
    dir: 'src/data/questions/most-likely',
    idPrefix: (level) => `mlt_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Wer würde am ehesten ',
    endsWith: '?',
    en: { startsWith: 'Who is most likely to ', endsWith: '?' },
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
    en: {},
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
    en: { groupLead: ['Alle: ', 'Everyone: '] },
  },
];

/** Physical contact with another player … */
const TOUCH = /(küss|kuss|massier|umarm|schoß|streich|berühr|hand|nacken|schulter|ohr|kuschel|knabber|lippen|knie|hals|tanz)/i;
/** … must come with an explicit opt-in for that player. */
const CONSENT = /(nur wenn|wenn \{other\}|wenn ihr beide|nur bei einem klaren ja|nur mit|einverstanden|zustimm|erlaubnis|darf|entscheid|wollt|möchte|mag|lust|reicht|letzte wort|ablehnen|ohne berührung)/i;
/** Body contact (stricter list for challenges, where dancing alone is common). */
const CONTACT = /(küss|kuss auf|einen kuss|massier|massage|umarm|im arm|schoß|streichel|berühr|nacken|schulter|kuschel|knabber|lippen|hals|puls|herzschlag|fütter|polonaise|wange an wange|slow dance|tango|tanzt .*eng|eng mit|verbundenen augen|augen verbinden|hand reich|die hand von|hand aufs herz|ins ohr|am ohr)/i;
const OPT_IN = new RegExp(`${CONSENT.source}|freiwillig|wollen|will|mitmachen`, 'i');
/**
 * No deck may make the round compare its players by looks or sex appeal
 * ("Wen findest du hier am attraktivsten?") – talking about yourself is fine.
 */
const LOOKS = /(attraktivst|hübschest|sexiest|am besten aussieht|besten aussehen|heißeste[nrs]? (ausstrahlung|körper|look|figur|promi-doppelgänger)|schönste[nrs]? (lippen|lächeln|augen|gesicht|körper|po|figur|haare|beine|hände))/i;
const PICKS_PLAYER = /(\bhier\b|\b(aus|in) (der|dieser) runde\b|\bdieser runde\b|^wer würde am ehesten |^alle:)/i;
const ABOUT_SELF = /\b(an dir selbst|dir selbst)\b/i;
/** … the same goes for sex appeal ("am verführerischsten", "der beste Kisser") … */
const SEX_APPEAL = /(verführerischst|beste[nr]? kisser|küsst[^.?!]*am besten)/i;
/** … while showing off yourself ("deinen verführerischsten Blick") rates nobody. */
const OWN_PERFORMANCE = /\b(dein|deine|deinen|deiner|eure|euren|eurer)\s+verführerischst/i;
const ranksLooks = (text) =>
  (LOOKS.test(text) || (SEX_APPEAL.test(text) && !OWN_PERFORMANCE.test(text))) &&
  PICKS_PLAYER.test(text) &&
  !ABOUT_SELF.test(text);
const involvesOthers = (text) =>
  text.includes('{other}') || text.startsWith('Alle:') || /\b(person|personen|jemand|jemanden)\b/i.test(text);
/** German cards whose text must ask for consent – their translation has to keep it. */
const needsConsent = (deck, q) =>
  (deck.consent === true && q.kind === 'dare' && q.text.includes('{other}') && TOUCH.test(q.text)) ||
  (deck.consent === 'others' && involvesOthers(q.text) && CONTACT.test(q.text));

/** English counterparts of the content rules. */
const EN_CONSENT = /(only if|only with|if \{other\}|if you both|if they|clear yes|agree|consent|permission|\bmay\b|decide|\bwants?\b|would like|feels? like|okay with|plays along|join in|who want|offers|say no|turn it down|turn you down|decline|veto|stop you|last word|without (any )?touching|optional|voluntar|passing is allowed)/i;
const EN_LOOKS = /(most attractive|best[- ]looking|prettiest|hottest (aura|body|look|figure|celebrity look-alike)|most beautiful (lips|smile|eyes|face|body|hair|legs|hands)|looks the best)/i;
const EN_PICKS_PLAYER = /(\bhere\b|\bin (this|the) group\b|^who is most likely to |^everyone:)/i;
const EN_ABOUT_SELF = /\b(yourself|of your own)\b/i;
const EN_SEX_APPEAL = /(most seductive|best kisser|kisses the best|sexiest (person|one|player|voice))/i;
const EN_OWN_PERFORMANCE = /\byour\s+(most seductive|sexiest)/i;
const EN_DRINKING = /\b(drink|drinks|drinking|shots?|sips?|chug|booze|alcohol|tipsy|drunk)\b/i;
const numbersIn = (text) => (text.match(/\d+/g) ?? []).sort().join(',');
/** Which placeholders a text uses (a translation may use "them" instead of a second {other}). */
const placeholdersIn = (text) => [...new Set(text.match(/\{[^}]*\}/g) ?? [])].sort().join(',');

const errors = [];
const ids = new Set();
const texts = new Map();
const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let total = 0;
let totalEn = 0;
const textsEn = new Map();

/** Checks the English file of one deck level against its German source cards. */
function validateEnglish(deck, level, source) {
  const name = `src/data/questions/en/${deck.mode}/${level}.json`;
  let data;
  try {
    data = JSON.parse(readFileSync(join(root, name), 'utf8'));
  } catch (error) {
    errors.push(`${name}: cannot be read or parsed (${error.message})`);
    return;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push(`${name}: must be an object { "<id>": "<text>" }`);
    return;
  }
  const sourceIds = new Set(source.map((q) => q.id));
  for (const id of Object.keys(data)) {
    if (!sourceIds.has(id)) errors.push(`${name}: "${id}" does not exist in the German deck`);
  }
  for (const q of source) {
    const where = `${name}[${q.id}]`;
    const text = data[q.id];
    if (typeof text !== 'string' || text.trim().length < 10) {
      errors.push(`${where}: translation missing or too short`);
      continue;
    }
    if (text.length > 180) errors.push(`${where}: text longer than 180 characters`);
    if (placeholdersIn(text) !== placeholdersIn(q.text)) errors.push(`${where}: placeholders differ from German`);
    if (numbersIn(text) !== numbersIn(q.text)) errors.push(`${where}: numbers differ from German (timer texts!)`);
    if (deck.en.startsWith && !text.startsWith(deck.en.startsWith)) {
      errors.push(`${where}: text must start with "${deck.en.startsWith}"`);
    }
    if (deck.en.endsWith && !text.endsWith(deck.en.endsWith)) {
      errors.push(`${where}: text must end with "${deck.en.endsWith}"`);
    }
    if (deck.en.groupLead && q.text.startsWith(deck.en.groupLead[0]) !== text.startsWith(deck.en.groupLead[1])) {
      errors.push(`${where}: group cards start with "${deck.en.groupLead[1]}" exactly when the German one does`);
    }
    if (q.text.endsWith('?') !== text.endsWith('?')) errors.push(`${where}: question/statement differs from German`);
    if ((deck.endsWithAny || q.kind === 'dare') && !['.', '!'].some((end) => text.endsWith(end))) {
      errors.push(`${where}: a task must end with . or !`);
    }
    if (needsConsent(deck, q) && !EN_CONSENT.test(text)) {
      errors.push(`${where}: the German card asks for consent – the translation must too`);
    }
    const enAppeal = EN_SEX_APPEAL.test(text) && !EN_OWN_PERFORMANCE.test(text);
    if ((EN_LOOKS.test(text) || enAppeal) && EN_PICKS_PLAYER.test(text) && !EN_ABOUT_SELF.test(text)) {
      errors.push(`${where}: compares players by their looks or sex appeal – rephrase around behaviour instead`);
    }
    if (EN_DRINKING.test(text)) errors.push(`${where}: no drinking in the game`);
    const key = normalize(text);
    if (textsEn.has(key)) errors.push(`${where}: duplicate text (also ${textsEn.get(key)})`);
    textsEn.set(key, where);
  }
  totalEn += source.length;
}

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
      if (ranksLooks(q.text)) {
        errors.push(`${where}: compares players by their looks or sex appeal – rephrase around behaviour instead`);
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
    if (deck.en) validateEnglish(deck, level, data);
    console.log(`✓ ${deck.mode} / ${level}: ${data.length}${deck.en ? ' (+ en)' : ''}`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} problem(s) found:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`\nAll ${total} cards and ${totalEn} English translations are valid.`);
