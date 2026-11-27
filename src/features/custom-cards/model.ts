import { getGameMode, isGameModeId, type GameModeId } from '@/features/game-modes/registry';
import { OTHER_PLAYER_PLACEHOLDER } from '@/features/question-decks/templates';
import { isCardKind, isSpicyLevel, LOCALES, type CardKind, type Locale, type Question, type SpicyLevel } from '@/types';

/**
 * A card written by the players themselves (Premium feature "customQuestions").
 * Custom cards live on the device only and are never translated: they are played
 * exactly as written, in every app language.
 */
export interface CustomCard {
  id: string;
  modeId: GameModeId;
  level: SpicyLevel;
  /** Full card text as shown in the game, incl. a fixed lead-in like "Ich hab noch nie". */
  text: string;
  /** "Wahrheit oder Pflicht" only. */
  kind?: CardKind;
  /** "Random Challenges" only: optional timer. */
  seconds?: number;
  createdAt: number;
}

/** What the editor hands over – `body` is the typed text without the mode's lead-in. */
export interface CustomCardDraft {
  modeId: GameModeId;
  level: SpicyLevel;
  body: string;
  kind?: CardKind;
  seconds?: number;
}

export type CustomCardError =
  | 'empty'
  | 'tooShort'
  | 'tooLong'
  | 'placeholder'
  | 'kind'
  | 'timer'
  | 'drinking'
  | 'minors'
  | 'consent'
  | 'limit';

export type CustomCardValidation =
  | { ok: true; text: string; kind?: CardKind; seconds?: number }
  | { ok: false; error: CustomCardError };

export const CUSTOM_ID_PREFIX = 'custom_';
export const CUSTOM_CARD_MAX_LENGTH = 180;
export const CUSTOM_CARD_MIN_BODY = 3;
export const MAX_CUSTOM_CARDS = 500;
/** Timer choices offered in the editor ("Random Challenges"). */
export const CUSTOM_TIMER_OPTIONS = [15, 30, 60] as const;
export const MIN_TIMER_SECONDS = 5;
export const MAX_TIMER_SECONDS = 120;

/*
 * Content rules for player-written cards (German, English and Spanish). They mirror the
 * rules of the built-in decks: the game works without alcohol, never involves minors and
 * never makes anybody do something against their will.
 */
// "Exen" is left out on purpose: it is also the plural of "Ex" (ex-partners); "bebé"
// (baby) does not count as drinking either.
const DRINKING =
  /\b(trink\w*|getrunken|schluck(?!auf)\w*|shots?|sauf\w*|besoffen|betrunken|alkohol\w*|drink\w*|drunk|tipsy|chug\w*|booze|alcohol\w*|beb(e|es|en|er|emos|ed|ido|idos|ida|idas|iendo|imos|ieron|a|as|an|amos)|bebidas?|tragos?|chupitos?|sorbos?|borrach\w*|emborrach\w*|ebri[oa]s?|cervezas?|tequilas?|vodka|whisky|cubatas?)\b/i;
const MINORS =
  /(minderjährig|\bunter 18\b|unter achtzehn|\bunder 18\b|underage|\bminors?\b|schulmädchen|schuljunge|schoolgirl|schoolboy|\bloli\b|lolita|jailbait|menor(es)? de edad|\bmenos de 18\b|menos de dieciocho|colegial)/i;
const NO_CONSENT =
  /(gegen (den|deinen|ihren|seinen|euren) willen|ohne (zu fragen|erlaubnis|einverständnis|zustimmung)|\bzwing\w*|\bgezwungen|against (their|her|his|your) will|without (asking|consent|permission)|\bforc(e|ed|es|ing)\b|contra (su|tu|vuestra) voluntad|sin (preguntar|pedir permiso|(su |tu )?permiso|(su |tu )?consentimiento)|\boblig\w*|a la fuerza|\bforz\w*)/i;
const PLACEHOLDER = /\{[^}]*\}/g;
const ENDS_WITH_PUNCTUATION = /[.!?…]$/;

export function isGroupMode(modeId: GameModeId): boolean {
  return getGameMode(modeId).turnStyle === 'group';
}

/** Group modes always start with their lead-in ("Ich hab noch nie …"). */
export function requiredLead(modeId: GameModeId, locale: Locale): string | null {
  const mode = getGameMode(modeId);
  return mode.turnStyle === 'group' && mode.cardLead ? mode.cardLead[locale] : null;
}

/** Players may mention a random other player – not in group modes, where everybody plays. */
export function allowsPlayerPlaceholder(modeId: GameModeId): boolean {
  return !isGroupMode(modeId);
}

export function needsKind(modeId: GameModeId): boolean {
  return Boolean(getGameMode(modeId).choice);
}

export function allowsTimer(modeId: GameModeId): boolean {
  return modeId === 'random-challenges';
}

function defaultEnding(modeId: GameModeId, kind?: CardKind): string {
  if (modeId === 'never-have-i-ever' || modeId === 'random-challenges') return '.';
  if (needsKind(modeId)) return kind === 'dare' ? '.' : '?';
  return '?';
}

/** Spanish questions and exclamations open with ¿ / ¡. */
const OPENING_MARK = /^[¿¡]/;
const SENTENCE_BREAK = /[.!?…:]\s+/g;

/** Removes a lead-in the player typed anyway (in any language), so it is not doubled. */
function stripLead(modeId: GameModeId, body: string): string {
  const mode = getGameMode(modeId);
  if (!mode.cardLead || mode.turnStyle !== 'group') return body;
  // "Quién es más probable que …" counts as the lead, with or without its "¿".
  const typed = body.replace(OPENING_MARK, '');
  for (const locale of LOCALES) {
    const lead = mode.cardLead[locale].replace(OPENING_MARK, '');
    if (typed.toLowerCase().startsWith(`${lead.toLowerCase()} `)) return typed.slice(lead.length + 1).trim();
  }
  return body;
}

/**
 * Adds the opening ¿ / ¡ of a Spanish question or exclamation to the last sentence of a
 * card when the player left it out ("Qué harías?" → "¿Qué harías?").
 */
export function withSpanishOpeningMark(text: string): string {
  const open = text.endsWith('?') ? '¿' : text.endsWith('!') ? '¡' : null;
  if (!open) return text;
  let start = 0;
  for (const match of text.slice(0, -1).matchAll(SENTENCE_BREAK)) start = (match.index ?? 0) + match[0].length;
  const sentence = text.slice(start);
  return sentence.includes(open) ? text : `${text.slice(0, start)}${open}${sentence}`;
}

/** Splits a stored card back into lead-in and editable body (for the editor). */
export function bodyOf(card: Pick<CustomCard, 'modeId' | 'text'>): string {
  return stripLead(card.modeId, card.text);
}

/**
 * Checks a draft and builds the final card text: adds the lead-in of group modes in
 * the current language and a fitting full stop / question mark if it is missing.
 */
export function validateCustomCard(draft: CustomCardDraft, locale: Locale): CustomCardValidation {
  const body = stripLead(draft.modeId, draft.body.replace(/\s+/g, ' ').trim());
  if (body.length === 0) return { ok: false, error: 'empty' };
  if (body.length < CUSTOM_CARD_MIN_BODY) return { ok: false, error: 'tooShort' };

  const lead = requiredLead(draft.modeId, locale);
  const kind = needsKind(draft.modeId) ? draft.kind : undefined;
  // A lead that opens with "¿" already starts the question.
  const withLead = lead ? `${lead} ${OPENING_MARK.test(lead) ? body.replace(OPENING_MARK, '') : body}` : body;
  const ended = ENDS_WITH_PUNCTUATION.test(withLead)
    ? withLead
    : `${withLead}${defaultEnding(draft.modeId, kind)}`;
  const text = locale === 'es' ? withSpanishOpeningMark(ended) : ended;
  if (text.length > CUSTOM_CARD_MAX_LENGTH) return { ok: false, error: 'tooLong' };

  const placeholders = text.match(PLACEHOLDER) ?? [];
  const placeholderOk = placeholders.every(
    (placeholder) => placeholder === OTHER_PLAYER_PLACEHOLDER && allowsPlayerPlaceholder(draft.modeId),
  );
  if (!placeholderOk) return { ok: false, error: 'placeholder' };

  if (needsKind(draft.modeId) && !isCardKind(kind)) return { ok: false, error: 'kind' };

  let seconds: number | undefined;
  if (draft.seconds !== undefined) {
    const valid =
      allowsTimer(draft.modeId) &&
      Number.isInteger(draft.seconds) &&
      draft.seconds >= MIN_TIMER_SECONDS &&
      draft.seconds <= MAX_TIMER_SECONDS;
    if (!valid) return { ok: false, error: 'timer' };
    seconds = draft.seconds;
  }

  if (DRINKING.test(text)) return { ok: false, error: 'drinking' };
  if (MINORS.test(text)) return { ok: false, error: 'minors' };
  if (NO_CONSENT.test(text)) return { ok: false, error: 'consent' };

  return { ok: true, text, ...(kind ? { kind } : {}), ...(seconds !== undefined ? { seconds } : {}) };
}

/** Custom cards join the deck like built-in cards, with their own category label. */
export function toQuestion(card: CustomCard): Question {
  return {
    id: card.id,
    level: card.level,
    category: 'custom',
    text: card.text,
    ...(card.kind ? { kind: card.kind } : {}),
    ...(card.seconds !== undefined ? { seconds: card.seconds } : {}),
  };
}

function isCustomCard(value: unknown): value is CustomCard {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.id === 'string' &&
    card.id.startsWith(CUSTOM_ID_PREFIX) &&
    isGameModeId(card.modeId) &&
    isSpicyLevel(card.level) &&
    typeof card.text === 'string' &&
    card.text.trim().length > 0 &&
    card.text.length <= CUSTOM_CARD_MAX_LENGTH &&
    (card.kind === undefined || isCardKind(card.kind)) &&
    (card.seconds === undefined ||
      (typeof card.seconds === 'number' &&
        Number.isInteger(card.seconds) &&
        card.seconds >= MIN_TIMER_SECONDS &&
        card.seconds <= MAX_TIMER_SECONDS)) &&
    typeof card.createdAt === 'number'
  );
}

/** Validates stored cards so corrupted storage can never crash the game. */
export function sanitizeCustomCards(value: unknown): CustomCard[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const cards: CustomCard[] = [];
  for (const entry of value) {
    if (!isCustomCard(entry) || seen.has(entry.id)) continue;
    // "Wahrheit oder Pflicht" deals by kind – a card without one could never be drawn.
    if (needsKind(entry.modeId) && !entry.kind) continue;
    seen.add(entry.id);
    const { id, modeId, level, text, kind, seconds, createdAt } = entry;
    cards.push({
      id,
      modeId,
      level,
      text,
      createdAt,
      ...(needsKind(modeId) && kind ? { kind } : {}),
      ...(allowsTimer(modeId) && seconds !== undefined ? { seconds } : {}),
    });
    if (cards.length >= MAX_CUSTOM_CARDS) break;
  }
  return cards;
}
