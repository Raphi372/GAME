import extreme from '@/data/questions/extreme.json';
import hot from '@/data/questions/hot.json';
import mild from '@/data/questions/mild.json';
import { getDeck, getDeckSize, hasContentInLocale } from '@/features/question-decks';
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
        'kein Objekt',
      ],
      'mild',
    );
    expect(questions.map((q) => q.id)).toEqual(['mild_1']);
    expect(issues).toHaveLength(6);
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
    expect(getDeck('truth-or-dare', 'mild')).toEqual([]);
  });
});
