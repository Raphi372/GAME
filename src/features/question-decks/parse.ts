import {
  isCardKind,
  isQuestionCategory,
  isSpicyLevel,
  type Question,
  type QuestionIntensity,
  type SpicyLevel,
} from '@/types';

export interface ParseIssue {
  index: number;
  reason: string;
}

export interface ParseResult {
  questions: Question[];
  issues: ParseIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntensity(value: unknown): value is QuestionIntensity {
  return value === 1 || value === 2 || value === 3;
}

/**
 * Validates raw JSON question data. Invalid or duplicate entries are skipped and
 * reported instead of crashing the app.
 */
export function parseQuestions(raw: unknown, expectedLevel?: SpicyLevel): ParseResult {
  const questions: Question[] = [];
  const issues: ParseIssue[] = [];
  if (!Array.isArray(raw)) {
    return { questions, issues: [{ index: -1, reason: 'not an array' }] };
  }

  const seenIds = new Set<string>();
  raw.forEach((entry: unknown, index) => {
    if (!isRecord(entry)) {
      issues.push({ index, reason: 'not an object' });
      return;
    }
    const { id, level, category, text, intensity, kind } = entry;
    if (typeof id !== 'string' || id.trim() === '') {
      issues.push({ index, reason: 'missing id' });
      return;
    }
    if (seenIds.has(id)) {
      issues.push({ index, reason: `duplicate id ${id}` });
      return;
    }
    if (!isSpicyLevel(level) || (expectedLevel && level !== expectedLevel)) {
      issues.push({ index, reason: `invalid level for ${id}` });
      return;
    }
    if (!isQuestionCategory(category)) {
      issues.push({ index, reason: `invalid category for ${id}` });
      return;
    }
    if (typeof text !== 'string' || text.trim().length < 5) {
      issues.push({ index, reason: `invalid text for ${id}` });
      return;
    }
    if (intensity !== undefined && !isIntensity(intensity)) {
      issues.push({ index, reason: `invalid intensity for ${id}` });
      return;
    }
    if (kind !== undefined && !isCardKind(kind)) {
      issues.push({ index, reason: `invalid kind for ${id}` });
      return;
    }
    seenIds.add(id);
    questions.push({
      id,
      level,
      category,
      text: text.trim(),
      ...(intensity !== undefined ? { intensity } : {}),
      ...(kind !== undefined ? { kind } : {}),
    });
  });
  return { questions, issues };
}
