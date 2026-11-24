import type { GameModeId } from '@/features/game-modes/registry';
import type { TranslationKey } from '@/i18n';
import { SPICY_LEVELS, type SpicyLevel } from '@/types';

export interface LevelMeta {
  id: SpicyLevel;
  emoji: string;
  heat: 1 | 2 | 3;
  /** Gradient used for cards and accents (from → to). */
  gradient: readonly [string, string];
  /** Main accent colour (glows, borders). */
  accent: string;
  /** Very dark tint used behind the question card. */
  tint: string;
  nameKey: TranslationKey;
  taglineKey: TranslationKey;
  descriptionKey: TranslationKey;
}

export const LEVELS: Record<SpicyLevel, LevelMeta> = {
  mild: {
    id: 'mild',
    emoji: '🌶️',
    heat: 1,
    gradient: ['#7C3AED', '#C084FC'],
    accent: '#B46CFF',
    tint: '#1C1030',
    nameKey: 'level.mild.name',
    taglineKey: 'level.mild.tagline',
    descriptionKey: 'level.mild.description',
  },
  hot: {
    id: 'hot',
    emoji: '🌶️🌶️',
    heat: 2,
    gradient: ['#C026D3', '#FF3D9A'],
    accent: '#FF3D9A',
    tint: '#2A0C26',
    nameKey: 'level.hot.name',
    taglineKey: 'level.hot.tagline',
    descriptionKey: 'level.hot.description',
  },
  extreme: {
    id: 'extreme',
    emoji: '🌶️🌶️🌶️',
    heat: 3,
    gradient: ['#FF2D55', '#B5179E'],
    accent: '#FF2D55',
    tint: '#2E0814',
    nameKey: 'level.extreme.name',
    taglineKey: 'level.extreme.tagline',
    descriptionKey: 'level.extreme.description',
  },
};

export function listLevels(): LevelMeta[] {
  return SPICY_LEVELS.map((level) => LEVELS[level]);
}

/** Modes can describe the levels in their own words; Spicy Questions uses the default. */
const MODE_LEVEL_DESCRIPTIONS: Partial<Record<GameModeId, Record<SpicyLevel, TranslationKey>>> = {
  'never-have-i-ever': {
    mild: 'nhie.level.mild.description',
    hot: 'nhie.level.hot.description',
    extreme: 'nhie.level.extreme.description',
  },
};

export function levelDescriptionKey(level: SpicyLevel, modeId: GameModeId): TranslationKey {
  return MODE_LEVEL_DESCRIPTIONS[modeId]?.[level] ?? LEVELS[level].descriptionKey;
}
