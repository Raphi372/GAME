import type { GroupTally } from '@/features/gameplay/engine/session';
import type { TranslationKey } from '@/i18n';
import type { CardKind, SpicyLevel } from '@/types';

/**
 * Game mode registry.
 *
 * Every mode owns its content and rules. Adding a new mode means:
 * 1. Add its id to `GAME_MODE_IDS`.
 * 2. Add a definition below (status `available` once content exists).
 * 3. Register its question packs in `src/features/question-decks/packs.ts`.
 * 4. Add the translation keys `mode.<id>.title|tagline`.
 */
export const GAME_MODE_IDS = [
  'spicy-questions',
  'never-have-i-ever',
  'truth-or-dare',
  'most-likely',
  'random-challenges',
] as const;

export type GameModeId = (typeof GAME_MODE_IDS)[number];

export type GameModeStatus = 'available' | 'coming-soon';

/**
 * Who is addressed by a card:
 * - `single-player`: the active player answers.
 * - `group`: the active player reads the card aloud, everybody plays along.
 */
export type TurnStyle = 'single-player' | 'group';

/** How a mode calls its cards in the UI ("110 Fragen", "100 Aussagen", "110 Karten"). */
export type CardUnit = 'questions' | 'statements' | 'cards' | 'challenges';

/** UI copy of a group mode (all translation keys, checked by TypeScript). */
export interface GroupModeCopy {
  pickerTitle: TranslationKey;
  pickerHint: TranslationKey;
  /** Accessible name of a player chip, receives `{name}`. */
  toggleLabel: TranslationKey;
  nextHint: TranslationKey;
  safetyHint: TranslationKey;
  summaryStat: TranslationKey;
  summaryTop: TranslationKey;
  /** Receives `{count}`. */
  summaryLine: TranslationKey;
  summaryLineOne: TranslationKey;
}

/** Button and summary texts of a single-player mode (defaults: Spicy Questions). */
export interface SingleModeCopy {
  next: TranslationKey;
  nextHint: TranslationKey;
  skip: TranslationKey;
  skipHint: TranslationKey;
  safetyHint: TranslationKey;
  summaryAnswered: TranslationKey;
  summaryTop: TranslationKey;
  /** Receives `{answered}` and `{passed}`. */
  summaryLine: TranslationKey;
}

export const DEFAULT_SINGLE_COPY: SingleModeCopy = {
  next: 'game.next',
  nextHint: 'game.nextHint',
  skip: 'game.skip',
  skipHint: 'game.skipHint',
  safetyHint: 'game.safetyHint',
  summaryAnswered: 'summary.answered',
  summaryTop: 'summary.mostDaring',
  summaryLine: 'summary.playerLine',
};

/** Rules of a choice mode: the active player picks a kind, then gets a card of it. */
export interface ChoiceModeConfig {
  kinds: readonly CardKind[];
}

/** Rules of a group mode: one person reads aloud, everybody plays along. */
export interface GroupModeConfig {
  /** Counter increased for every player marked on a card. */
  tally: GroupTally;
  /** Offer a 3-2-1 countdown so everybody points at the same time. */
  countdown: boolean;
  copy: GroupModeCopy;
}

export interface GameModeDefinition {
  id: GameModeId;
  emoji: string;
  status: GameModeStatus;
  turnStyle: TurnStyle;
  usesSpicyLevels: boolean;
  cardUnit: CardUnit;
  /** Fixed lead-in a card may start with, highlighted on the card (content language). */
  cardLead?: string;
  /** Label shown above cards that have no lead-in (e.g. "Challenge"). */
  cardLabel?: TranslationKey;
  /** Single-player modes: custom button and summary texts. */
  singleCopy?: SingleModeCopy;
  /** Required for `turnStyle: 'group'`. */
  group?: GroupModeConfig;
  /** Player picks the kind of card first ("Wahrheit oder Pflicht"). */
  choice?: ChoiceModeConfig;
  /** Short rules shown before the game ("So geht's"). */
  howTo?: TranslationKey;
  /** Mode-specific level descriptions; defaults to the Spicy Questions texts. */
  levelDescriptions?: Record<SpicyLevel, TranslationKey>;
  minPlayers: number;
  maxPlayers: number;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 20;

export const GAME_MODES: Record<GameModeId, GameModeDefinition> = {
  'spicy-questions': {
    id: 'spicy-questions',
    emoji: '🔥',
    status: 'available',
    turnStyle: 'single-player',
    usesSpicyLevels: true,
    cardUnit: 'questions',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
  'never-have-i-ever': {
    id: 'never-have-i-ever',
    emoji: '🙊',
    status: 'available',
    turnStyle: 'group',
    usesSpicyLevels: true,
    cardUnit: 'statements',
    cardLead: 'Ich hab noch nie',
    howTo: 'nhie.howTo',
    levelDescriptions: {
      mild: 'nhie.level.mild.description',
      hot: 'nhie.level.hot.description',
      extreme: 'nhie.level.extreme.description',
    },
    group: {
      tally: 'confessed',
      countdown: false,
      copy: {
        pickerTitle: 'nhie.whoHas',
        pickerHint: 'nhie.whoHasHint',
        toggleLabel: 'nhie.confessToggle',
        nextHint: 'nhie.nextHint',
        safetyHint: 'nhie.safetyHint',
        summaryStat: 'summary.confessions',
        summaryTop: 'summary.mostConfessions',
        summaryLine: 'summary.confessionLine',
        summaryLineOne: 'summary.confessionLineOne',
      },
    },
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
  'truth-or-dare': {
    id: 'truth-or-dare',
    emoji: '🎲',
    status: 'available',
    turnStyle: 'single-player',
    usesSpicyLevels: true,
    cardUnit: 'cards',
    howTo: 'tod.howTo',
    levelDescriptions: {
      mild: 'tod.level.mild.description',
      hot: 'tod.level.hot.description',
      extreme: 'tod.level.extreme.description',
    },
    choice: { kinds: ['truth', 'dare'] },
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
  'most-likely': {
    id: 'most-likely',
    emoji: '👀',
    status: 'available',
    turnStyle: 'group',
    usesSpicyLevels: true,
    cardUnit: 'questions',
    cardLead: 'Wer würde am ehesten',
    howTo: 'mlt.howTo',
    levelDescriptions: {
      mild: 'mlt.level.mild.description',
      hot: 'mlt.level.hot.description',
      extreme: 'mlt.level.extreme.description',
    },
    group: {
      tally: 'picked',
      countdown: true,
      copy: {
        pickerTitle: 'mlt.pickerTitle',
        pickerHint: 'mlt.pickerHint',
        toggleLabel: 'mlt.toggle',
        nextHint: 'mlt.nextHint',
        safetyHint: 'mlt.safetyHint',
        summaryStat: 'summary.picks',
        summaryTop: 'summary.mostPicked',
        summaryLine: 'summary.pickLine',
        summaryLineOne: 'summary.pickLineOne',
      },
    },
    minPlayers: 3,
    maxPlayers: MAX_PLAYERS,
  },
  'random-challenges': {
    id: 'random-challenges',
    emoji: '⚡',
    status: 'available',
    turnStyle: 'single-player',
    usesSpicyLevels: true,
    cardUnit: 'challenges',
    cardLead: 'Alle:',
    cardLabel: 'rc.cardLabel',
    howTo: 'rc.howTo',
    levelDescriptions: {
      mild: 'rc.level.mild.description',
      hot: 'rc.level.hot.description',
      extreme: 'rc.level.extreme.description',
    },
    singleCopy: {
      next: 'rc.next',
      nextHint: 'rc.nextHint',
      skip: 'rc.skip',
      skipHint: 'rc.skipHint',
      safetyHint: 'tod.safetyHint',
      summaryAnswered: 'summary.challengesDone',
      summaryTop: 'summary.mostChallenges',
      summaryLine: 'summary.challengeLine',
    },
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
};

export const DEFAULT_MODE_ID: GameModeId = 'spicy-questions';

export function getGameMode(id: GameModeId): GameModeDefinition {
  return GAME_MODES[id];
}

export function isGameModeId(value: unknown): value is GameModeId {
  return typeof value === 'string' && (GAME_MODE_IDS as readonly string[]).includes(value);
}

export function isModePlayable(id: GameModeId): boolean {
  return GAME_MODES[id].status === 'available';
}

export function listGameModes(): GameModeDefinition[] {
  return GAME_MODE_IDS.map((id) => GAME_MODES[id]);
}

export function listPlayableModeIds(): GameModeId[] {
  return GAME_MODE_IDS.filter(isModePlayable);
}

export function isGroupMode(id: GameModeId): boolean {
  return GAME_MODES[id].turnStyle === 'group';
}
