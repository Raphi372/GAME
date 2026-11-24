import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getGameMode, isGameModeId, isModePlayable, type GameModeId } from '@/features/game-modes/registry';
import {
  changeLevel as changeSessionLevel,
  completeTurn,
  createSession,
  repairSession,
  reshuffleLevel,
  skipQuestion,
  syncSessionPlayers,
  type GameSession,
  type PlayerStats,
  type SessionContext,
} from '@/features/gameplay/engine/session';
import { getDeck } from '@/features/question-decks';
import {
  nextColorIndex,
  validatePlayerName,
  type ValidationResult,
} from '@/features/players/validation';
import { getRng } from '@/services/randomSource';
import { persistStorage, STORAGE_KEYS } from '@/services/storage';
import { isSpicyLevel, type Player, type SpicyLevel } from '@/types';
import { createId } from '@/utils/id';

import { useSettingsStore } from './settingsStore';

export interface GameData {
  players: Player[];
  session: GameSession | null;
  /** Level chosen most recently – pre-selected next time. */
  lastLevel: SpicyLevel;
}

export interface PlayerResult extends Player, PlayerStats {}

/** Summary of a finished game (kept in memory only, never persisted). */
export interface GameResult {
  modeId: GameModeId;
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

  startGame: (modeId: GameModeId, level: SpicyLevel) => boolean;
  answer: () => void;
  pass: () => void;
  skip: () => void;
  changeLevel: (level: SpicyLevel) => void;
  reshuffle: () => void;
  endGame: () => void;
  resetAll: () => void;
}

export const INITIAL_GAME_DATA: GameData = { players: [], session: null, lastLevel: 'mild' };

function contextFor(players: readonly Player[], modeId: GameModeId): SessionContext {
  const locale = useSettingsStore.getState().locale;
  return {
    players,
    rng: getRng(),
    getDeck: (level) => getDeck(modeId, level, { locale }),
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

function isSessionLike(value: unknown): value is GameSession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === 'string' &&
    isGameModeId(session.modeId) &&
    isSpicyLevel(session.level) &&
    typeof session.turnCounts === 'object' &&
    typeof session.playedByLevel === 'object'
  );
}

export function buildResult(session: GameSession, players: readonly Player[], now: number): GameResult {
  return {
    modeId: session.modeId,
    level: session.level,
    turnsCompleted: session.turnsCompleted,
    durationMs: Math.max(0, now - session.startedAt),
    players: players.map((player) => ({
      ...player,
      ...(session.stats[player.id] ?? { answered: 0, passed: 0, skipped: 0 }),
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
  if (isSessionLike(data.session)) {
    const players = result.players ?? [];
    result.session =
      players.length >= 2
        ? repairSession(data.session, contextFor(players, data.session.modeId))
        : null;
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
          if (session && remaining.length < getGameMode(session.modeId).minPlayers) {
            // Not enough players left for the running game: it ends.
            set({ players: remaining, session: null });
            return true;
          }
          setPlayers(remaining);
          return true;
        },

        clearPlayers: () => set({ players: [], session: null }),

        startGame: (modeId, level) => {
          const { players } = get();
          const mode = getGameMode(modeId);
          if (!isModePlayable(modeId) || players.length < mode.minPlayers) return false;
          const session = createSession(
            { id: createId('session', getRng()), modeId, level, now: Date.now() },
            contextFor(players, modeId),
          );
          set({ session, lastLevel: level });
          return true;
        },

        answer: () => updateSession((session, ctx) => completeTurn(session, 'answered', ctx)),
        pass: () => updateSession((session, ctx) => completeTurn(session, 'passed', ctx)),
        skip: () => updateSession(skipQuestion),
        changeLevel: (level) => {
          updateSession((session, ctx) => changeSessionLevel(session, level, ctx));
          set({ lastLevel: level });
        },
        reshuffle: () => updateSession(reshuffleLevel),
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
      partialize: ({ players, session, lastLevel }) => ({ players, session, lastLevel }),
      merge: (persisted, current) => ({ ...current, ...sanitizeGameData(persisted) }),
    },
  ),
);
