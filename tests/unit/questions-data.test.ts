import extreme from '@/data/questions/extreme.json';
import hot from '@/data/questions/hot.json';
import mild from '@/data/questions/mild.json';
import nhieExtreme from '@/data/questions/never-have-i-ever/extreme.json';
import nhieHot from '@/data/questions/never-have-i-ever/hot.json';
import mltExtreme from '@/data/questions/most-likely/extreme.json';
import mltHot from '@/data/questions/most-likely/hot.json';
import mltMild from '@/data/questions/most-likely/mild.json';
import nhieMild from '@/data/questions/never-have-i-ever/mild.json';
import rcExtreme from '@/data/questions/random-challenges/extreme.json';
import rcHot from '@/data/questions/random-challenges/hot.json';
import rcMild from '@/data/questions/random-challenges/mild.json';
import todExtreme from '@/data/questions/truth-or-dare/extreme.json';
import todHot from '@/data/questions/truth-or-dare/hot.json';
import todMild from '@/data/questions/truth-or-dare/mild.json';
import {
  countBuiltInCards,
  getDeck,
  getDeckSize,
  hasContentInLocale,
  splitLead,
} from '@/features/question-decks';
import type { QuestionPack } from '@/features/question-decks/packs';
import { parseQuestions } from '@/features/question-decks/parse';
import { QUESTION_CATEGORIES, SPICY_LEVELS } from '@/types';

const files = { mild, hot, extreme };

describe('question database', () => {
  it.each(SPICY_LEVELS)('%s contains at least 100 valid questions', (level) => {
    const { questions, issues } = parseQuestions(files[level], level);
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
  });

  it('has at least 300 questions in total', () => {
    const total = SPICY_LEVELS.reduce((sum, level) => sum + getDeckSize('spicy-questions', level), 0);
    expect(total).toBeGreaterThanOrEqual(300);
  });

  it('uses unique ids and unique texts across all levels', () => {
    const all = SPICY_LEVELS.flatMap((level) => getDeck('spicy-questions', level));
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    const normalised = all.map((q) => q.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
    expect(new Set(normalised).size).toBe(all.length);
  });

  it('uses only known categories, matching levels and allowed placeholders', () => {
    for (const level of SPICY_LEVELS) {
      for (const question of getDeck('spicy-questions', level)) {
        expect(question.level).toBe(level);
        expect(question.id.startsWith(`${level}_`)).toBe(true);
        expect(QUESTION_CATEGORIES).toContain(question.category);
        const placeholders = question.text.match(/\{[^}]*\}/g) ?? [];
        placeholders.forEach((placeholder) => expect(placeholder).toBe('{other}'));
      }
    }
  });

  it('uses several categories per level for variety', () => {
    for (const level of SPICY_LEVELS) {
      const categories = new Set(getDeck('spicy-questions', level).map((q) => q.category));
      expect(categories.size).toBeGreaterThanOrEqual(5);
    }
  });

  it('contains no drinking instructions', () => {
    const all = SPICY_LEVELS.flatMap((level) => getDeck('spicy-questions', level));
    all.forEach((q) => expect(q.text).not.toMatch(/\b(trink|shot|schluck|ex(e|t)?n)\b/i));
  });
});

describe('"Ich hab noch nie" deck', () => {
  const nhieFiles = { mild: nhieMild, hot: nhieHot, extreme: nhieExtreme };

  it.each(SPICY_LEVELS)('%s contains at least 100 valid statements', (level) => {
    const { questions, issues } = parseQuestions(nhieFiles[level], level);
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
  });

  it('only contains "Ich hab noch nie …" statements without placeholders', () => {
    for (const level of SPICY_LEVELS) {
      for (const card of getDeck('never-have-i-ever', level)) {
        expect(card.id.startsWith(`nhie_${level}_`)).toBe(true);
        expect(card.text.startsWith('Ich hab noch nie ')).toBe(true);
        expect(card.text).not.toMatch(/[{}]/);
        expect(QUESTION_CATEGORIES).toContain(card.category);
      }
    }
  });

  it('has unique ids and texts across all game modes', () => {
    const modes = [
      'spicy-questions',
      'never-have-i-ever',
      'most-likely',
      'truth-or-dare',
      'random-challenges',
    ] as const;
    const all = modes.flatMap((mode) => SPICY_LEVELS.flatMap((level) => getDeck(mode, level)));
    expect(new Set(all.map((card) => card.id)).size).toBe(all.length);
    expect(new Set(all.map((card) => card.text.toLowerCase())).size).toBe(all.length);
    expect(countBuiltInCards(modes)).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(1500);
  });

  it('never lets the round compare players by their looks or sex appeal', () => {
    const modes = [
      'spicy-questions',
      'never-have-i-ever',
      'most-likely',
      'truth-or-dare',
      'random-challenges',
    ] as const;
    const looks =
      /(attraktivst|hübschest|sexiest|am besten aussieht|besten aussehen|heißeste[nrs]? (ausstrahlung|körper|look|figur|promi-doppelgänger)|schönste[nrs]? (lippen|lächeln|augen|gesicht|körper|po|figur|haare|beine|hände))/i;
    const picksPlayer = /(\bhier\b|\b(aus|in) (der|dieser) runde\b|\bdieser runde\b|^wer würde am ehesten |^alle:)/i;
    const aboutSelf = /\b(an dir selbst|dir selbst)\b/i;
    const sexAppeal = /(verführerischst|beste[nr]? kisser|küsst[^.?!]*am besten)/i;
    const ownPerformance = /\b(dein|deine|deinen|deiner|eure|euren|eurer)\s+verführerischst/i;
    const ranks = (text: string) =>
      (looks.test(text) || (sexAppeal.test(text) && !ownPerformance.test(text))) &&
      picksPlayer.test(text) &&
      !aboutSelf.test(text);
    expect(ranks('Wer aus dieser Runde küsst deiner Meinung nach am besten?')).toBe(true);
    expect(ranks('Wirf jeder Person in der Runde deinen verführerischsten Blick zu.')).toBe(false);
    const offending = modes
      .flatMap((mode) => SPICY_LEVELS.flatMap((level) => getDeck(mode, level)))
      .filter((card) => ranks(card.text));
    expect(offending.map((card) => card.text)).toEqual([]);
  });

  it('contains no drinking instructions', () => {
    const all = SPICY_LEVELS.flatMap((level) => getDeck('never-have-i-ever', level));
    all.forEach((card) => expect(card.text).not.toMatch(/\b(trink|shot|schluck|ex(e|t)?n)/i));
  });

  it('splits the lead-in for display', () => {
    expect(splitLead('Ich hab noch nie gelogen.', 'Ich hab noch nie')).toEqual({
      lead: 'Ich hab noch nie',
      rest: 'gelogen.',
    });
    expect(splitLead('Andere Frage?', 'Ich hab noch nie')).toEqual({ lead: null, rest: 'Andere Frage?' });
    expect(splitLead('Text', '')).toEqual({ lead: null, rest: 'Text' });
    // One lead per content language.
    expect(splitLead('Never have I ever lied.', ['Ich hab noch nie', 'Never have I ever'])).toEqual({
      lead: 'Never have I ever',
      rest: 'lied.',
    });
  });
});

describe('"Wer würde am ehesten?" deck', () => {
  const mltFiles = { mild: mltMild, hot: mltHot, extreme: mltExtreme };

  it.each(SPICY_LEVELS)('%s contains at least 100 valid questions', (level) => {
    const { questions, issues } = parseQuestions(mltFiles[level], level);
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
  });

  it('only contains "Wer würde am ehesten …?" questions without placeholders', () => {
    for (const level of SPICY_LEVELS) {
      for (const card of getDeck('most-likely', level)) {
        expect(card.id.startsWith(`mlt_${level}_`)).toBe(true);
        expect(card.text.startsWith('Wer würde am ehesten ')).toBe(true);
        expect(card.text.endsWith('?')).toBe(true);
        expect(card.text).not.toMatch(/[{}]/);
      }
    }
  });

  it('stays respectful: no insults, shaming or drinking', () => {
    const all = SPICY_LEVELS.flatMap((level) => getDeck('most-likely', level));
    const banned = /(hässlich|\bdumm|\bfett\b|betrüg|fremdgeh|\btrink|\bschluck)/i;
    all.forEach((card) => expect(card.text).not.toMatch(banned));
  });
});

describe('"Wahrheit oder Pflicht" deck', () => {
  const todFiles = { mild: todMild, hot: todHot, extreme: todExtreme };
  const dares = SPICY_LEVELS.flatMap((level) =>
    getDeck('truth-or-dare', level).filter((card) => card.kind === 'dare'),
  );

  it.each(SPICY_LEVELS)('%s has at least 100 cards with enough truths and dares', (level) => {
    const { questions, issues } = parseQuestions(todFiles[level], level);
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
    expect(questions.filter((q) => q.kind === 'truth').length).toBeGreaterThanOrEqual(40);
    expect(questions.filter((q) => q.kind === 'dare').length).toBeGreaterThanOrEqual(40);
  });

  it('truths are questions and dares are tasks', () => {
    for (const level of SPICY_LEVELS) {
      for (const card of getDeck('truth-or-dare', level)) {
        expect(card.id.startsWith(`tod_${level}_`)).toBe(true);
        if (card.kind === 'truth') expect(card.text.endsWith('?')).toBe(true);
        else expect(card.text).toMatch(/[.!]$/);
      }
    }
  });

  it('asks for consent whenever a dare touches another player', () => {
    const touch = /(küss|kuss|massier|umarm|schoß|streich|berühr|hand|nacken|schulter|ohr|kuschel|knabber|lippen|knie|hals|tanz)/i;
    const consent = /(nur wenn|wenn \{other\}|wenn ihr beide|nur bei einem klaren ja|nur mit|einverstanden|zustimm|erlaubnis|darf|entscheid|wollt|möchte|mag|lust|reicht|letzte wort|ablehnen|ohne berührung)/i;
    const offending = dares.filter(
      (card) => card.text.includes('{other}') && touch.test(card.text) && !consent.test(card.text),
    );
    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('contains no drinking, nudity or reading of private chats', () => {
    const banned = /(\btrink|\bschluck|\bshot|nackt|auszieh|chatverlauf|nachrichten vor)/i;
    for (const level of SPICY_LEVELS) {
      getDeck('truth-or-dare', level).forEach((card) => expect(card.text).not.toMatch(banned));
    }
  });
});

describe('"Random Challenges" deck', () => {
  const rcFiles = { mild: rcMild, hot: rcHot, extreme: rcExtreme };
  const all = SPICY_LEVELS.flatMap((level) => getDeck('random-challenges', level));

  it.each(SPICY_LEVELS)('%s has at least 100 valid challenges, many with a timer', (level) => {
    const { questions, issues } = parseQuestions(rcFiles[level], level);
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
    expect(questions.filter((q) => q.seconds !== undefined).length).toBeGreaterThanOrEqual(20);
    expect(questions.filter((q) => q.text.startsWith('Alle: ')).length).toBeGreaterThanOrEqual(10);
  });

  it('challenges are tasks with sensible timers', () => {
    for (const card of all) {
      expect(card.id).toMatch(/^rc_(mild|hot|extreme)_\d{3}$/);
      expect(card.text).toMatch(/[.!]$/);
      if (card.seconds !== undefined) {
        expect(card.seconds).toBeGreaterThanOrEqual(5);
        expect(card.seconds).toBeLessThanOrEqual(120);
      }
    }
  });

  it('asks for consent whenever a challenge involves body contact with others', () => {
    const contact = /(küss|kuss auf|einen kuss|massier|massage|umarm|im arm|schoß|streichel|berühr|nacken|schulter|kuschel|knabber|lippen|hals|puls|herzschlag|fütter|polonaise|wange an wange|slow dance|tango|tanzt .*eng|eng mit|verbundenen augen|augen verbinden|hand reich|die hand von|hand aufs herz|ins ohr|am ohr)/i;
    const optIn = /(nur wenn|wenn \{other\}|wenn ihr beide|nur bei einem klaren ja|nur mit|einverstanden|zustimm|erlaubnis|darf|entscheid|wollt|möchte|mag|lust|reicht|letzte wort|ablehnen|ohne berührung|freiwillig|wollen|will|mitmachen)/i;
    const others = (text: string) =>
      text.includes('{other}') || text.startsWith('Alle:') || /\b(person|personen|jemand|jemanden)\b/i.test(text);
    const offending = all.filter((card) => others(card.text) && contact.test(card.text) && !optIn.test(card.text));
    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('contains no drinking, nudity, humiliation or ranking of looks', () => {
    const banned =
      /(\btrink|\bschluck|\bshot|nackt|auszieh|bloßstell|demütig|am besten aussieht|heißeste ausstrahlung|attraktivst|hübschest)/i;
    all.forEach((card) => expect(card.text).not.toMatch(banned));
  });
});

describe('English content', () => {
  const modes = [
    'spicy-questions',
    'never-have-i-ever',
    'most-likely',
    'truth-or-dare',
    'random-challenges',
  ] as const;
  const pairs = modes.flatMap((mode) =>
    SPICY_LEVELS.flatMap((level) => {
      const de = getDeck(mode, level, { locale: 'de' });
      const en = getDeck(mode, level, { locale: 'en' });
      return de.map((card, index) => ({ mode, de: card, en: en[index]! }));
    }),
  );

  it('translates every card and keeps ids, categories, kinds and timers', () => {
    for (const mode of modes) {
      for (const level of SPICY_LEVELS) {
        const de = getDeck(mode, level, { locale: 'de' });
        const en = getDeck(mode, level, { locale: 'en' });
        expect(en.map(({ text: _text, ...meta }) => meta)).toEqual(de.map(({ text: _text, ...meta }) => meta));
      }
    }
    expect(countBuiltInCards(modes, 'en')).toBe(countBuiltInCards(modes, 'de'));
    expect(new Set(pairs.map((pair) => pair.en.text.toLowerCase())).size).toBe(pairs.length);
  });

  it('keeps placeholders, numbers and the card format of the German original', () => {
    const numbers = (text: string) => (text.match(/\d+/g) ?? []).sort().join(',');
    for (const { mode, de, en } of pairs) {
      expect(en.text).not.toBe(de.text);
      expect(en.text.includes('{other}')).toBe(de.text.includes('{other}'));
      expect(numbers(en.text)).toBe(numbers(de.text));
      expect(en.text.endsWith('?')).toBe(de.text.endsWith('?'));
      expect(en.text.startsWith('Everyone: ')).toBe(de.text.startsWith('Alle: '));
      if (mode === 'never-have-i-ever') expect(en.text).toMatch(/^Never have I ever .+\.$/);
      if (mode === 'most-likely') expect(en.text).toMatch(/^Who is most likely to .+\?$/);
    }
  });

  it('keeps the consent wording wherever the German card needs consent', () => {
    // Same rule as the validator: touching another player needs an explicit opt-in.
    const touch = /(küss|kuss|massier|umarm|schoß|streich|berühr|hand|nacken|schulter|ohr|kuschel|knabber|lippen|knie|hals|tanz)/i;
    const contact =
      /(küss|kuss auf|einen kuss|massier|massage|umarm|im arm|schoß|streichel|berühr|nacken|schulter|kuschel|knabber|lippen|hals|puls|herzschlag|fütter|polonaise|wange an wange|slow dance|tango|tanzt .*eng|eng mit|verbundenen augen|augen verbinden|hand reich|die hand von|hand aufs herz|ins ohr|am ohr)/i;
    const others = (text: string) =>
      text.includes('{other}') || text.startsWith('Alle:') || /\b(person|personen|jemand|jemanden)\b/i.test(text);
    const askedEn =
      /(only if|only with|if \{other\}|if you both|if they|clear yes|agree|consent|permission|\bmay\b|decide|\bwants?\b|would like|feels? like|okay with|plays along|join in|who want|offers|say no|turn it down|turn you down|decline|veto|stop you|last word|without (any )?touching|optional|voluntar|passing is allowed)/i;
    const needsConsent = pairs.filter(
      ({ mode, de }) =>
        (mode === 'truth-or-dare' && de.kind === 'dare' && de.text.includes('{other}') && touch.test(de.text)) ||
        (mode === 'random-challenges' && others(de.text) && contact.test(de.text)),
    );
    expect(needsConsent.length).toBeGreaterThan(50);
    expect(needsConsent.filter(({ en }) => !askedEn.test(en.text)).map(({ en }) => en.id)).toEqual([]);
  });

  it('contains no drinking or nudity and never compares players by looks or sex appeal', () => {
    const banned = /\b(drink|drinks|drinking|shots?|sips?|chug|booze|alcohol|tipsy|drunk|naked|nude|undress)\b/i;
    const looks = /(most attractive|best[- ]looking|prettiest|hottest (aura|body|look)|most beautiful (lips|smile|eyes|face))/i;
    const picksPlayer = /(\bhere\b|\bin (this|the) group\b|^who is most likely to |^everyone:)/i;
    const aboutSelf = /\b(yourself|of your own)\b/i;
    const sexAppeal = /(most seductive|best kisser|kisses the best|sexiest (person|one|player|voice))/i;
    const ownPerformance = /\byour\s+(most seductive|sexiest)/i;
    pairs.forEach(({ en }) => expect(en.text).not.toMatch(banned));
    const ranking = pairs.filter(
      ({ en }) =>
        (looks.test(en.text) || (sexAppeal.test(en.text) && !ownPerformance.test(en.text))) &&
        picksPlayer.test(en.text) &&
        !aboutSelf.test(en.text),
    );
    expect(ranking.map(({ en }) => en.text)).toEqual([]);
  });
});

describe('Spanish content', () => {
  const modes = [
    'spicy-questions',
    'never-have-i-ever',
    'most-likely',
    'truth-or-dare',
    'random-challenges',
  ] as const;
  const pairs = modes.flatMap((mode) =>
    SPICY_LEVELS.flatMap((level) => {
      const de = getDeck(mode, level, { locale: 'de' });
      const es = getDeck(mode, level, { locale: 'es' });
      return de.map((card, index) => ({ mode, de: card, es: es[index]! }));
    }),
  );
  /** JavaScript's \b only knows ASCII letters – Spanish words need Unicode-aware edges. */
  const words = (source: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');

  it('translates every card and keeps ids, categories, kinds and timers', () => {
    for (const mode of modes) {
      for (const level of SPICY_LEVELS) {
        const de = getDeck(mode, level, { locale: 'de' });
        const es = getDeck(mode, level, { locale: 'es' });
        expect(es.map(({ text: _text, ...meta }) => meta)).toEqual(de.map(({ text: _text, ...meta }) => meta));
      }
    }
    expect(countBuiltInCards(modes, 'es')).toBe(countBuiltInCards(modes, 'de'));
    expect(new Set(pairs.map((pair) => pair.es.text.toLowerCase())).size).toBe(pairs.length);
  });

  it('keeps placeholders, numbers and the card format – with ¿ and ¡', () => {
    const numbers = (text: string) => (text.match(/\d+/g) ?? []).sort().join(',');
    for (const { mode, de, es } of pairs) {
      expect(es.text).not.toBe(de.text);
      expect(es.text.includes('{other}')).toBe(de.text.includes('{other}'));
      expect(numbers(es.text)).toBe(numbers(de.text));
      expect(es.text.endsWith('?')).toBe(de.text.endsWith('?'));
      expect(es.text.split('¿').length).toBe(es.text.split('?').length);
      expect(es.text.split('¡').length).toBe(es.text.split('!').length);
      expect(es.text.startsWith('Todos: ')).toBe(de.text.startsWith('Alle: '));
      if (mode === 'never-have-i-ever') expect(es.text).toMatch(/^Yo nunca .+\.$/);
      if (mode === 'most-likely') expect(es.text).toMatch(/^¿Quién es más probable que .+\?$/);
    }
  });

  it('keeps the consent wording wherever the German card needs consent', () => {
    const touch = /(küss|kuss|massier|umarm|schoß|streich|berühr|hand|nacken|schulter|ohr|kuschel|knabber|lippen|knie|hals|tanz)/i;
    const contact =
      /(küss|kuss auf|einen kuss|massier|massage|umarm|im arm|schoß|streichel|berühr|nacken|schulter|kuschel|knabber|lippen|hals|puls|herzschlag|fütter|polonaise|wange an wange|slow dance|tango|tanzt .*eng|eng mit|verbundenen augen|augen verbinden|hand reich|die hand von|hand aufs herz|ins ohr|am ohr)/i;
    const others = (text: string) =>
      text.includes('{other}') || text.startsWith('Alle:') || /\b(person|personen|jemand|jemanden)\b/i.test(text);
    const askedEs =
      /(solo si|si \{other\}|si (los|las) dos|sí claro|de acuerdo|acept|consentimiento|permiso|decid|quiere|quieren|quiera|apetece|le parece bien|decir que no|rechaz|negarse|veto|la última palabra|sin tocar|sin contacto|opcional|voluntari|se puede pasar)/iu;
    const needsConsent = pairs.filter(
      ({ mode, de }) =>
        (mode === 'truth-or-dare' && de.kind === 'dare' && de.text.includes('{other}') && touch.test(de.text)) ||
        (mode === 'random-challenges' && others(de.text) && contact.test(de.text)),
    );
    expect(needsConsent.length).toBeGreaterThan(50);
    expect(needsConsent.filter(({ es }) => !askedEs.test(es.text)).map(({ es }) => es.id)).toEqual([]);
  });

  it('contains no drinking and stays neutral for Spain and Latin America', () => {
    const drinking = words(
      '(?!bebés?(?![\\p{L}]))beb\\p{L}*|tragos?|chupitos?|sorbos?|shots?|alcohol\\p{L}*|borrach\\p{L}*|emborrach\\p{L}*|cervezas?|brindis',
    );
    // No "vosotros" (Spain) and no "ustedes" (Latin America): one player is "tú", the group is described.
    const pluralAddress = new RegExp(
      `${words('vosotr[oa]s|vuestr[oa]s?|ustedes|os').source}|\\p{L}(áis|éis)(?![\\p{L}])|^todos: \\p{L}+[aei]d(?![\\p{L}])`,
      'iu',
    );
    // Everyday words that are vulgar or unusual in part of the Spanish-speaking world.
    const regional = words('coger|coge|cogido|chaqueta|concha|pinche|culo|móvil|celular|coche|carro|guay|ligar|pillar');
    for (const { es } of pairs) {
      expect(es.text).not.toMatch(drinking);
      expect(es.text).not.toMatch(pluralAddress);
      expect(es.text).not.toMatch(regional);
    }
  });
});

describe('question parsing', () => {
  it('skips invalid and duplicate entries instead of crashing', () => {
    const { questions, issues } = parseQuestions(
      [
        { id: 'mild_1', level: 'mild', category: 'flirty', text: 'Eine gültige Frage?' },
        { id: 'mild_1', level: 'mild', category: 'flirty', text: 'Doppelte ID?' },
        { id: 'mild_2', level: 'hot', category: 'flirty', text: 'Falsches Level?' },
        { id: 'mild_3', level: 'mild', category: 'unknown', text: 'Falsche Kategorie?' },
        { id: 'mild_4', level: 'mild', category: 'flirty', text: '' },
        { id: 'mild_5', level: 'mild', category: 'flirty', text: 'Intensität?', intensity: 7 },
        { id: 'mild_6', level: 'mild', category: 'flirty', text: 'Falsche Art?', kind: 'joke' },
        { id: 'mild_7', level: 'mild', category: 'funny', text: 'Viel zu langer Timer.', seconds: 999 },
        'kein Objekt',
      ],
      'mild',
    );
    expect(questions.map((q) => q.id)).toEqual(['mild_1']);
    expect(issues).toHaveLength(8);
  });

  it('reports non-array input', () => {
    expect(parseQuestions({}).issues).toHaveLength(1);
  });
});

describe('deck loading', () => {
  const freePack: QuestionPack = {
    id: 'free',
    modeId: 'spicy-questions',
    level: 'mild',
    tier: 'free',
    locale: 'de',
    questions: [{ id: 'f1', level: 'mild', category: 'flirty', text: 'Freie Frage?' }],
  };
  const premiumPack: QuestionPack = {
    ...freePack,
    id: 'premium',
    tier: 'premium',
    questions: [{ id: 'p1', level: 'mild', category: 'flirty', text: 'Premium Frage?' }],
  };

  it('loads the deck for the selected level only', () => {
    expect(getDeck('spicy-questions', 'hot').every((q) => q.level === 'hot')).toBe(true);
  });

  it('only includes premium packs with a premium entitlement', () => {
    const packs = [freePack, premiumPack];
    expect(getDeck('spicy-questions', 'mild', { packs }).map((q) => q.id)).toEqual(['f1']);
    expect(
      getDeck('spicy-questions', 'mild', { packs, entitlements: { premium: true } }).map((q) => q.id),
    ).toEqual(['f1', 'p1']);
  });

  it('ships content in German and English', () => {
    expect(hasContentInLocale('de')).toBe(true);
    expect(hasContentInLocale('en')).toBe(true);
    expect(getDeck('spicy-questions', 'mild', { locale: 'en' })[0]?.text).toBe('What’s your biggest turn-on?');
  });

  it('falls back to German when a deck has no content in the UI language', () => {
    expect(getDeck('spicy-questions', 'mild', { packs: [freePack], locale: 'en' }).map((q) => q.id)).toEqual([
      'f1',
    ]);
  });

  it('returns an empty deck when a mode has no pack', () => {
    expect(getDeck('random-challenges', 'mild', { packs: [] })).toEqual([]);
  });
});
