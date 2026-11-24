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

/** How a mode calls its cards in the UI ("110 Fragen" vs. "100 Aussagen"). */
export type CardUnit = 'questions' | 'statements';

export interface GameModeDefinition {
  id: GameModeId;
  emoji: string;
  status: GameModeStatus;
  turnStyle: TurnStyle;
  usesSpicyLevels: boolean;
  cardUnit: CardUnit;
  /** Fixed lead-in every card starts with, highlighted on the card (content language). */
  cardLead?: string;
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
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
  'truth-or-dare': {
    id: 'truth-or-dare',
    emoji: '🎲',
    status: 'coming-soon',
    turnStyle: 'single-player',
    usesSpicyLevels: true,
    cardUnit: 'questions',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  },
  'most-likely': {
    id: 'most-likely',
    emoji: '👀',
    status: 'coming-soon',
    turnStyle: 'group',
    usesSpicyLevels: true,
    cardUnit: 'questions',
    minPlayers: 3,
    maxPlayers: MAX_PLAYERS,
  },
  'random-challenges': {
    id: 'random-challenges',
    emoji: '⚡',
    status: 'coming-soon',
    turnStyle: 'single-player',
    usesSpicyLevels: true,
    cardUnit: 'questions',
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
