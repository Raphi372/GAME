#!/usr/bin/env node
/**
 * Validates all question decks (src/data/questions/**) and their translations
 * (src/data/questions/<en|es>/<mode>/<level>.json: { "<id>": "<text>" }).
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
    translations: { en: {}, es: {} },
  },
  {
    mode: 'never-have-i-ever',
    dir: 'src/data/questions/never-have-i-ever',
    idPrefix: (level) => `nhie_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Ich hab noch nie ',
    translations: { en: { startsWith: 'Never have I ever ' }, es: { startsWith: 'Yo nunca ' } },
  },
  {
    mode: 'most-likely',
    dir: 'src/data/questions/most-likely',
    idPrefix: (level) => `mlt_${level}_`,
    minPerLevel: 100,
    placeholders: [],
    startsWith: 'Wer würde am ehesten ',
    endsWith: '?',
    translations: {
      en: { startsWith: 'Who is most likely to ', endsWith: '?' },
      es: { startsWith: '¿Quién es más probable que ', endsWith: '?' },
    },
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
    translations: { en: {}, es: {} },
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
    /** Challenges for the whole group start with this lead – in every language. */
    groupLead: 'Alle: ',
    translations: { en: { groupLead: 'Everyone: ' }, es: { groupLead: 'Todos: ' } },
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

/**
 * Spanish counterparts. JavaScript's \b only knows ASCII letters, so Spanish words are
 * matched with Unicode-aware boundaries instead.
 */
const words = (source) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');
/**
 * Consent of the other person: "si {other} quiere", "si los dos quieren", "{other} decide" –
 * third-person forms only, so "donde quieras" (the active player chooses) does not count.
 */
const ES_CONSENT = words(
  'solo si|sólo si|si \\{other\\}|si a \\{other\\}|si (los|las) dos|si ambos|si ambas|de ambas partes|' +
    'un sí claro|sí claro|de acuerdo|consentimiento|permiso|quiere|quieren|quiera|quieran|apetece|' +
    'tiene ganas|tienen ganas|le parece bien|les parece bien|decide|deciden|decida|decidan|acepta|aceptan|' +
    'decir que no|dice que no|rechazar\\p{L}*|negarse|veto|la última palabra|sin tocar|sin contacto|' +
    'opcional|voluntari\\p{L}*|se puede pasar',
);
const ES_LOOKS = /(más atractiv|más guap|más lind|más bell|mejor aspecto|mejor cuerpo|mejor figura|(cuerpo|figura|aura|look|sonrisa|mirada|cara|boca|labios|ojos|pelo|cabello|piernas|manos|trasero) más (bonit|lind|herm|bell|sexy|atractiv))/iu;
const ES_PICKS_PLAYER = new RegExp(
  `${words('aquí|(en|de) (este|el|tu) grupo|del grupo|(en|de) la ronda').source}|^¿quién es más probable que |^todos:`,
  'iu',
);
const ES_ABOUT_SELF = words('(ti|tú) mism[oa]s?');
const ES_SEX_APPEAL = /(más seductor|besa mejor|mejor besador|besar mejor|más sexy)/iu;
/** "tu/su mirada más seductora" – each player shows off their own (group cards say "su"). */
const ES_OWN_PERFORMANCE = /(?<![\p{L}])(tus?|sus?)\s+\p{L}+\s+más\s+(seductor|seductora|sexy)/iu;
const ES_DRINKING = words(
  '(?!bebés?(?![\\p{L}]))beb\\p{L}*|tragos?|chupitos?|sorbos?|shots?|alcohol\\p{L}*|borrach\\p{L}*|emborrach\\p{L}*|ebri[oa]s?|cervezas?|chelas?|birras?|tequilas?|vodka|whisky|cubatas?|copas?|brindis|' +
    // "tomar algo" is how Latin America says "have a drink".
    '(toma|tomar|tómate|tomarse|tomemos|tomen) algo',
);
/** Neutral Spanish for Spain and Latin America: no "vosotros" and no "ustedes". */
const ES_PLURAL_ADDRESS = new RegExp(
  `${words('vosotr[oa]s|vuestr[oa]s?|ustedes|os|\\p{L}+(áis|éis)').source}|^todos: \\p{L}+[aei]d(?![\\p{L}])`,
  'iu',
);
/** Words that are regional or vulgar somewhere in the Spanish-speaking world. */
const ES_REGIONAL = words(
  'coger|coge|cogí|cogido|cogida|cachond\\p{L}*|pinche|concha|chaqueta|papaya|bicho|culo|follar|joder|polvo|correrse|móvil|celular|ordenador|computadora|coche|carro|guay|chévere|mola|chaval\\p{L}*|pillar|pillad[oa]s?|ligar|ligue|liarse|morre\\p{L}*|enrollarse',
);
/**
 * The player – and the person reading a "Yo nunca" card aloud – can be of any gender, so
 * a card never calls them "nervioso" or "nerviosa": it says "te dan nervios" instead.
 */
const ES_GENDERED_ADDRESS = new RegExp(
  `(?<![\\p{L}])(estás|estabas|estuviste|estarías|eres|eras|fuiste|serías|has estado|has sido|te sientes|te sentías|te sentiste|te sentirías|te has sentido|te pones|te pusiste|te has puesto|te pondrías|te quedas|te quedaste|te has quedado|te quedarías|te pone|te ponen|te puso|te pusieron|te hace sentir|te hizo sentir|te consideras|he estado|he sido|me he sentido|me he puesto|me he quedado|me sentí|me puse|me quedé)\\s+((muy|más|tan|demasiado|bastante|súper)\\s+)?(?!(una|uno|unas|unos|la|las|lo|los|esa|ese|eso|esas|esos|esta|este|esto|estas|estos|otra|otro|otras|otros|toda|todo|todas|todos|mucha|mucho|poca|poco|nada|algo|alguna|alguno|ninguna|ninguno|cada|para|contra|hacia|hasta|como|cuando|donde|nunca|ahora|ya|no|pronto|luego|temprano|despacio|todavía|medio|media|cerca|dentro|fuera|encima|arriba|abajo|afuera|adentro|contigo|conmigo|consigo|tanto|tanta|tu|tus|su|sus|mi|mis|capaz|parte|fan|pareja|cita|presa)(?![\\p{L}])|\\p{L}+(ando|iendo|yendo)(?![\\p{L}]))\\p{L}+[oa]s?(?![\\p{L}])`,
  'iu',
);
const count = (text, char) => text.split(char).length - 1;
const numbersIn = (text) => (text.match(/\d+/g) ?? []).sort().join(',');
/** Which placeholders a text uses (a translation may use "them" instead of a second {other}). */
const placeholdersIn = (text) => [...new Set(text.match(/\{[^}]*\}/g) ?? [])].sort().join(',');

/** Content rules per translation language. */
const LANGUAGES = {
  en: {
    name: 'English',
    consent: EN_CONSENT,
    drinking: EN_DRINKING,
    ranksLooks: (text) =>
      (EN_LOOKS.test(text) || (EN_SEX_APPEAL.test(text) && !EN_OWN_PERFORMANCE.test(text))) &&
      EN_PICKS_PLAYER.test(text) &&
      !EN_ABOUT_SELF.test(text),
    extra: () => [],
  },
  es: {
    name: 'Spanish',
    consent: ES_CONSENT,
    drinking: ES_DRINKING,
    ranksLooks: (text) =>
      (ES_LOOKS.test(text) || (ES_SEX_APPEAL.test(text) && !ES_OWN_PERFORMANCE.test(text))) &&
      ES_PICKS_PLAYER.test(text) &&
      !ES_ABOUT_SELF.test(text),
    extra: (text) => [
      ...(count(text, '¿') !== count(text, '?') ? ['every question opens with ¿ and closes with ?'] : []),
      ...(count(text, '¡') !== count(text, '!') ? ['every exclamation opens with ¡ and closes with !'] : []),
      ...(ES_PLURAL_ADDRESS.test(text)
        ? [`"${text.match(ES_PLURAL_ADDRESS)[0]}" – no vosotros/ustedes: address one player with "tú" or describe the group`]
        : []),
      ...(ES_REGIONAL.test(text) ? [`"${text.match(ES_REGIONAL)[0]}" is regional or vulgar in parts of the Spanish-speaking world`] : []),
      ...(ES_GENDERED_ADDRESS.test(text)
        ? [`"${text.match(ES_GENDERED_ADDRESS)[0]}" – addresses the player with a gendered word, rephrase neutrally`]
        : []),
    ],
  },
};

const errors = [];
const ids = new Set();
const texts = new Map();
const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let total = 0;
const translated = Object.fromEntries(Object.keys(LANGUAGES).map((lang) => [lang, { total: 0, texts: new Map() }]));

/** Checks one translation file of a deck level against its German source cards. */
function validateTranslation(deck, level, source, lang) {
  const rules = LANGUAGES[lang];
  const format = deck.translations[lang];
  const seen = translated[lang];
  const name = `src/data/questions/${lang}/${deck.mode}/${level}.json`;
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
    if (format.startsWith && !text.startsWith(format.startsWith)) {
      errors.push(`${where}: text must start with "${format.startsWith}"`);
    }
    if (format.endsWith && !text.endsWith(format.endsWith)) {
      errors.push(`${where}: text must end with "${format.endsWith}"`);
    }
    if (format.groupLead && q.text.startsWith(deck.groupLead) !== text.startsWith(format.groupLead)) {
      errors.push(`${where}: group cards start with "${format.groupLead}" exactly when the German one does`);
    }
    if (q.text.endsWith('?') !== text.endsWith('?')) errors.push(`${where}: question/statement differs from German`);
    if ((deck.endsWithAny || q.kind === 'dare') && !['.', '!'].some((end) => text.endsWith(end))) {
      errors.push(`${where}: a task must end with . or !`);
    }
    if (needsConsent(deck, q) && !rules.consent.test(text)) {
      errors.push(`${where}: the German card asks for consent – the translation must too`);
    }
    if (rules.ranksLooks(text)) {
      errors.push(`${where}: compares players by their looks or sex appeal – rephrase around behaviour instead`);
    }
    if (rules.drinking.test(text)) errors.push(`${where}: no drinking in the game`);
    for (const problem of rules.extra(text)) errors.push(`${where}: ${problem}`);
    const key = normalize(text);
    if (seen.texts.has(key)) errors.push(`${where}: duplicate text (also ${seen.texts.get(key)})`);
    seen.texts.set(key, where);
  }
  seen.total += source.length;
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
    const langs = Object.keys(deck.translations);
    for (const lang of langs) validateTranslation(deck, level, data, lang);
    console.log(`✓ ${deck.mode} / ${level}: ${data.length} (+ ${langs.join(', ')})`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} problem(s) found:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
const summary = Object.entries(translated).map(([lang, { total: n }]) => `${n} ${LANGUAGES[lang].name}`);
console.log(`\nAll ${total} cards and their translations (${summary.join(', ')}) are valid.`);
