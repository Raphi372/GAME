import { Platform } from 'react-native';

/** Animation durations in milliseconds. Kept short so the game never feels slow. */
export const durations = {
  instant: 0,
  fast: 140,
  base: 240,
  slow: 380,
  reveal: 460,
} as const;

export const springs = {
  press: { friction: 6, tension: 260 },
  card: { friction: 8, tension: 70 },
} as const;

/** The native animation driver is unavailable on web – fall back to JS there. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
