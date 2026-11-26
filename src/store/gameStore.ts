import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  getGameMode,
  isGameModeId,
  isModePlayable,
  listPlayableModeIds,
  minPlayersFor,
  type GameModeId,
} from '@/features/game-modes/registry';
import { isMixedRound, ROUND_LENGTHS, type RoundSettings } from '@/features/gameplay/engine/round';
import {
  changeLevel as changeSessionLevel,
  chooseCard as chooseSessionCard,
  completeGroupRound,
  completeTurn,
  emptyStats,
  createSession,
  isSessionOver,
  normalizeRound,
  repairSession,
  reshuffleLevel,
  skipQuestion,
  syncSessionPlayers,
  type GameSession,
  type PlayerStats,
  type SessionContext,
} from '@/features/gameplay/engine/session';
import {
  nextColorIndex,
  validatePlayerName,
  type ValidationResult,
} from '@/features/players/validation';
import { getRng } from '@/services/randomSource';
import { persistStorage, STORAGE_KEYS } from '@/services/storage';
import {
  isCardKind,
  isSpicyLevel,
  SPICY_LEVELS,
  type CardKind,
  type Player,
  type SpicyLevel,
} from '@/types';
import { createId } from '@/utils/id';

import { getPlayableDeck } from './decks';
import { useSettingsStore } from './settingsStore';

/** Round options chosen before a game ("Runde anpassen"). */
export interface RoundSetup {
  /** Cards in the round; `null` = endless. */
  length: number | null;
  /** Start MILD and build up to the chosen level. */
  escalate: boolean;
  /** Mixed round: the modes to mix (at least two). */
  modeIds?: GameModeId[];
}

/** Round options used most recently – pre-selected next time. */
export interface LastRound {
  length: number | null;
  escalate: boolean;
  /** Modes picked for the last mixed round. */
  mixModeIds: GameModeId[];
}

export interface GameData {
  players: Player[];
  session: GameSession | null;
  /** Level chosen most recently – pre-selected next time. */
  lastLevel: SpicyLevel;
  lastRound: LastRound;
}

export interface PlayerResult extends Player, PlayerStats {}

/** Summary of a finished game (kept in memory only, never persisted). */
export interface GameResult {
  modeId: GameModeId;
  /** The round mixed several modes. */
  mixed: boolean;
  /** Modes the round was played with. */
  modeIds: GameModeId[];
  level: SpicyLevel;
  turnsCompleted: number;
  durationMs: number;
  players: PlayerResult[];
}

export interface GameState extends GameData {
  lastResult: GameResult | null;
  addPlayer: (name: string) => ValidationResult;
  renamePlayer: (id: string, name: string) => ValidationResult;
  /**
   * Removes a player. If a running game would be left with too few players it is
   * ended. Returns false if the player does not exist.
   */
  removePlayer: (id: string) => boolean;
  clearPlayers: () => void;

  /** Starts a game – optionally with a round length, escalation or mixed modes. */
  startGame: (modeId: GameModeId, level: SpicyLevel, setup?: RoundSetup) => boolean;
  answer: () => void;
  pass: () => void;
  /**
   * Group modes: counts the marked players with the mode's tally (confessions,
   * picks …) and the next player reads the next card.
   */
  nextGroupCard: (markedPlayerIds: readonly string[]) => void;
  /** Choice modes: the active player picks "truth" or "dare". */
  chooseCard: (kind: CardKind) => void;
  skip: () => void;
  changeLevel: (level: SpicyLevel) => void;
  reshuffle: () => void;
  /**
   * Re-checks the running game against the current decks, e.g. after the players
   * deleted the custom card that is on the table – a new card is dealt if needed.
   */
  refreshDecks: () => void;
  endGame: () => void;
  resetAll: () => void;
}

export const DEFAULT_LAST_ROUND: LastRound = {
  length: null,
  escalate: false,
  mixModeIds: listPlayableModeIds(),
};

export const INITIAL_GAME_DATA: GameData = {
  players: [],
  session: null,
  lastLevel: 'mild',
  lastRound: DEFAULT_LAST_ROUND,
};

function contextFor(players: readonly Player[], modeId: GameModeId): SessionContext {
  const locale = useSettingsStore.getState().locale;
  return {
    players,
    rng: getRng(),
    getDeck: (level) => getPlayableDeck(modeId, level, locale),
    choiceKinds: getGameMode(modeId).choice?.kinds,
    forMode: (id) => ({
      getDeck: (level) => getPlayableDeck(id, level, locale),
      choiceKinds: getGameMode(id).choice?.kinds,
      minPlayers: getGameMode(id).minPlayers,
    }),
  };
}

/** Players a running game needs at least – a mixed round only needs its smallest mode's. */
export function sessionMinPlayers(session: GameSession): number {
  return isMixedRound(session.round) ? minPlayersFor(session.round.modeIds) : getGameMode(session.modeId).minPlayers;
}

function playableModeIds(value: unknown): GameModeId[] {
  return Array.isArray(value) ? [...new Set(value.filter(isGameModeId).filter(isModePlayable))] : [];
}

function toRound(value: unknown): Partial<RoundSettings> {
  if (!isRecord(value)) return {};
  const length = finiteNumber(value.length);
  return {
    length,
    modeIds: playableModeIds(value.modeIds),
    escalate: value.escalate === true,
    ...(isSpicyLevel(value.peak) ? { peak: value.peak } : {}),
  };
}

function toLastRound(value: unknown): LastRound {
  if (!isRecord(value)) return DEFAULT_LAST_ROUND;
  const length = finiteNumber(value.length);
  const mixModeIds = playableModeIds(value.mixModeIds);
  return {
    // Only lengths the level screen offers – anything else would start a round nobody chose.
    length: (ROUND_LENGTHS as readonly number[]).includes(length ?? NaN) ? length : null,
    escalate: value.escalate === true,
    mixModeIds: mixModeIds.length >= 2 ? mixModeIds : DEFAULT_LAST_ROUND.mixModeIds,
  };
}

function isPlayer(value: unknown): value is Player {
  if (typeof value !== 'object' || value === null) return false;
  const player = value as Record<string, unknown>;
  return (
    typeof player.id === 'string' &&
    typeof player.name === 'string' &&
    typeof player.colorIndex === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Keeps only the known, numeric counters of a stored player's statistics. */
function toStats(value: unknown): PlayerStats {
  const stats = emptyStats();
  if (!isRecord(value)) return stats;
  for (const key of Object.keys(stats) as (keyof PlayerStats)[]) {
    const count = finiteNumber(value[key]);
    if (count !== null && count >= 0) stats[key] = count;
  }
  return stats;
}

/**
 * Turns stored data into a well-formed session (missing or broken parts get safe
 * defaults) – or `null` if it is not a session at all. Older app versions and
 * corrupted storage must never stop the app from starting.
 */
export function toSession(value: unknown, now = Date.now()): GameSession | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !isGameModeId(value.modeId) || !isSpicyLevel(value.level)) return null;

  const storedPlayed = isRecord(value.playedByLevel) ? value.playedByLevel : {};
  const playedByLevel = Object.fromEntries(
    SPICY_LEVELS.map((level) => {
      const ids = storedPlayed[level];
      return [level, Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []];
    }),
  ) as Record<SpicyLevel, string[]>;

  const turnCounts: Record<string, number> = {};
  if (isRecord(value.turnCounts)) {
    for (const [id, count] of Object.entries(value.turnCounts)) {
      const number = finiteNumber(count);
      if (number !== null && number >= 0) turnCounts[id] = number;
    }
  }

  const stats: Record<string, PlayerStats> = {};
  if (isRecord(value.stats)) {
    for (const [id, entry] of Object.entries(value.stats)) stats[id] = toStats(entry);
  }

  const storedCurrent = value.current;
  const current =
    isRecord(storedCurrent) && typeof storedCurrent.playerId === 'string'
      ? {
          playerId: storedCurrent.playerId,
          questionId: stringOrNull(storedCurrent.questionId),
          targetPlayerId: stringOrNull(storedCurrent.targetPlayerId),
          ...(isCardKind(storedCurrent.kind) || storedCurrent.kind === null
            ? { kind: storedCurrent.kind as CardKind | null }
            : {}),
        }
      : null;

  const dealtByMode: Partial<Record<GameModeId, number>> = {};
  if (isRecord(value.dealtByMode)) {
    for (const [id, count] of Object.entries(value.dealtByMode)) {
      const number = finiteNumber(count);
      if (isGameModeId(id) && number !== null && number >= 0) dealtByMode[id] = number;
    }
  }

  return {
    id: value.id,
    modeId: value.modeId,
    level: value.level,
    // Games saved before rounds existed are endless single-mode rounds.
    round: normalizeRound(toRound(value.round), value.modeId, value.level),
    dealtByMode,
    startedAt: finiteNumber(value.startedAt) ?? now,
    playedByLevel,
    turnCounts,
    lastPlayerId: stringOrNull(value.lastPlayerId),
    current,
    turnsCompleted: Math.max(0, finiteNumber(value.turnsCompleted) ?? 0),
    stats,
  };
}

export function buildResult(session: GameSession, players: readonly Player[], now: number): GameResult {
  return {
    modeId: session.modeId,
    mixed: isMixedRound(session.round),
    modeIds: session.round.modeIds,
    level: session.level,
    turnsCompleted: session.turnsCompleted,
    durationMs: Math.max(0, now - session.startedAt),
    players: players.map((player) => ({
      ...player,
      ...emptyStats(),
      ...session.stats[player.id],
    })),
  };
}

/** Validates persisted data so a corrupted storage can never crash the app. */
export function sanitizeGameData(persisted: unknown): Partial<GameData> {
  if (typeof persisted !== 'object' || persisted === null) return {};
  const data = persisted as Record<string, unknown>;
  const result: Partial<GameData> = {};
  if (Array.isArray(data.players)) {
    result.players = data.players.filter(isPlayer).slice(0, getGameMode('spicy-questions').maxPlayers);
  }
  if (isSpicyLevel(data.lastLevel)) result.lastLevel = data.lastLevel;
  if ('lastRound' in data) result.lastRound = toLastRound(data.lastRound);
  const session = toSession(data.session);
  if (session) {
    const players = result.players ?? [];
    let repaired: GameSession | null = null;
    // A round that was already over when the app closed is not resumed.
    if (!isSessionOver(session) && players.length >= sessionMinPlayers(session)) {
      try {
        repaired = repairSession(session, contextFor(players, session.modeId));
      } catch (error) {
        // Never block the app start because of a broken saved game – start without it.
        if (__DEV__) console.warn('[game] discarded a saved game that could not be restored', error);
      }
    }
    result.session = repaired;
  }
  return result;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      /** Applies an engine transition to the running session. */
      const updateSession = (
        transition: (session: GameSession, ctx: SessionContext) => GameSession,
      ) => {
        const { session, players } = get();
        if (!session) return;
        set({ session: transition(session, contextFor(players, session.modeId)) });
      };

      const setPlayers = (players: Player[]) => {
        const { session } = get();
        set({
          players,
          session: session
            ? syncSessionPlayers(session, contextFor(players, session.modeId))
            : null,
        });
      };

      return {
        ...INITIAL_GAME_DATA,
        lastResult: null,

        addPlayer: (name) => {
          const { players } = get();
          const result = validatePlayerName(name, players);
          if (result.ok) {
            setPlayers([
              ...players,
              { id: createId('player', getRng()), name: result.name, colorIndex: nextColorIndex(players) },
            ]);
          }
          return result;
        },

        renamePlayer: (id, name) => {
          const { players } = get();
          const result = validatePlayerName(name, players, id);
          if (result.ok) {
            setPlayers(players.map((player) => (player.id === id ? { ...player, name: result.name } : player)));
          }
          return result;
        },

        removePlayer: (id) => {
          const { players, session } = get();
          if (!players.some((player) => player.id === id)) return false;
          const remaining = players.filter((player) => player.id !== id);
          if (session && remaining.length < sessionMinPlayers(session)) {
            // Not enough players left for the running game: it ends.
            set({ players: remaining, session: null });
            return true;
          }
          setPlayers(remaining);
          return true;
        },

        clearPlayers: () => set({ players: [], session: null }),

        startGame: (modeId, level, setup) => {
          const { players, lastRound } = get();
          const mixing = (setup?.modeIds?.length ?? 0) > 1;
          // Mixed rounds leave out modes that need more players than are here.
          const modeIds = (mixing ? playableModeIds(setup?.modeIds) : [modeId]).filter(
            (id) => isModePlayable(id) && players.length >= getGameMode(id).minPlayers,
          );
          const first = modeIds[0];
          if (!first) return false;
          const session = createSession(
            {
              id: createId('session', getRng()),
              modeId: first,
              level,
              now: Date.now(),
              round: { length: setup?.length ?? null, escalate: setup?.escalate ?? false, modeIds },
            },
            contextFor(players, first),
          );
          set({
            session,
            lastLevel: level,
            lastRound: {
              length: session.round.length,
              escalate: setup?.escalate ?? false,
              mixModeIds: mixing ? playableModeIds(setup?.modeIds) : lastRound.mixModeIds,
            },
          });
          return true;
        },

        answer: () => updateSession((session, ctx) => completeTurn(session, 'answered', ctx)),
        pass: () => updateSession((session, ctx) => completeTurn(session, 'passed', ctx)),
        nextGroupCard: (markedPlayerIds) =>
          updateSession((session, ctx) =>
            completeGroupRound(
              session,
              markedPlayerIds,
              ctx,
              getGameMode(session.modeId).group?.tally ?? 'confessed',
            ),
          ),
        skip: () => updateSession(skipQuestion),
        chooseCard: (kind) => updateSession((session, ctx) => chooseSessionCard(session, kind, ctx)),
        changeLevel: (level) => {
          updateSession((session, ctx) => changeSessionLevel(session, level, ctx));
          set({ lastLevel: level });
        },
        reshuffle: () => updateSession(reshuffleLevel),
        refreshDecks: () => updateSession(repairSession),
        endGame: () => {
          const { session, players } = get();
          if (!session) return;
          set({ session: null, lastResult: buildResult(session, players, Date.now()) });
        },
        resetAll: () => set({ ...INITIAL_GAME_DATA, lastResult: null }),
      };
    },
    {
      name: STORAGE_KEYS.game,
      version: 1,
      storage: persistStorage,
      partialize: ({ players, session, lastLevel, lastRound }) => ({ players, session, lastLevel, lastRound }),
      merge: (persisted, current) => ({ ...current, ...sanitizeGameData(persisted) }),
    },
  ),
);
