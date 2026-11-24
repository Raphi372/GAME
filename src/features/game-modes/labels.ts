import type { TranslationKey } from '@/i18n';

import { GAME_MODES, type GameModeId } from './registry';

/** Translation keys per mode – checked by TypeScript against the dictionaries. */
export function modeTitleKey(id: GameModeId): TranslationKey {
  return `mode.${id}.title`;
}

export function modeTaglineKey(id: GameModeId): TranslationKey {
  return `mode.${id}.tagline`;
}

/** "{count} Fragen" or "{count} Aussagen", depending on the mode. */
export function cardCountKey(id: GameModeId): TranslationKey {
  return `mode.unit.${GAME_MODES[id].cardUnit}`;
}
