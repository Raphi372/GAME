import extreme from '@/data/questions/extreme.json';
import hot from '@/data/questions/hot.json';
import mild from '@/data/questions/mild.json';
import nhieExtreme from '@/data/questions/never-have-i-ever/extreme.json';
import nhieHot from '@/data/questions/never-have-i-ever/hot.json';
import mltExtreme from '@/data/questions/most-likely/extreme.json';
import mltHot from '@/data/questions/most-likely/hot.json';
import mltMild from '@/data/questions/most-likely/mild.json';
import nhieMild from '@/data/questions/never-have-i-ever/mild.json';
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
    const modes = ['spicy-questions', 'never-have-i-ever', 'most-likely', 'truth-or-dare'] as const;
    const all = modes.flatMap((mode) => SPICY_LEVELS.flatMap((level) => getDeck(mode, level)));
    expect(new Set(all.map((card) => card.id)).size).toBe(all.length);
    expect(new Set(all.map((card) => card.text.toLowerCase())).size).toBe(all.length);
    expect(countBuiltInCards(modes)).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(1200);
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
        'kein Objekt',
      ],
      'mild',
    );
    expect(questions.map((q) => q.id)).toEqual(['mild_1']);
    expect(issues).toHaveLength(7);
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

  it('falls back to German content for other UI languages', () => {
    expect(hasContentInLocale('de')).toBe(true);
    expect(hasContentInLocale('en')).toBe(false);
    expect(getDeck('spicy-questions', 'mild', { locale: 'en' })).toEqual(
      getDeck('spicy-questions', 'mild', { locale: 'de' }),
    );
  });

  it('returns an empty deck for modes without content', () => {
    expect(getDeck('random-challenges', 'mild')).toEqual([]);
  });
});
