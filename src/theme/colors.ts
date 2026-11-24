/**
 * SPICY NIGHT – Dark Luxury colour tokens.
 *
 * All UI colours must come from this file so the look stays consistent and
 * can be re-themed in one place.
 */
export const palette = {
  black: '#07050B',
  night: '#0D0A13',
  anthracite: '#15111C',
  graphite: '#1D1727',
  plum: '#2A1E3A',
  violetDeep: '#3B1A5C',
  violet: '#8B5CF6',
  neonPurple: '#B14DFF',
  lilac: '#D4A8FF',
  magenta: '#E040FB',
  pink: '#FF3D9A',
  hotPink: '#FF2E7E',
  crimson: '#FF2D55',
  white: '#FFFFFF',
  ink: '#F7F2FF',
  mist: '#BDB2D1',
  smoke: '#8C82A1',
  ash: '#5E5570',
  success: '#3DDC97',
  warning: '#FFC861',
  danger: '#FF5470',
} as const;

export const colors = {
  background: palette.black,
  backgroundAlt: palette.night,
  surface: palette.anthracite,
  surfaceRaised: palette.graphite,
  surfaceHighlight: palette.plum,
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(212, 168, 255, 0.28)',
  overlay: 'rgba(4, 2, 8, 0.78)',

  text: palette.ink,
  textSecondary: palette.mist,
  textMuted: palette.smoke,
  textDisabled: palette.ash,
  textOnAccent: palette.white,
  lilacOrText: palette.lilac,

  primary: palette.neonPurple,
  primarySoft: 'rgba(177, 77, 255, 0.16)',
  accent: palette.pink,
  accentSoft: 'rgba(255, 61, 154, 0.14)',

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  dangerSoft: 'rgba(255, 84, 112, 0.14)',
} as const;

/** Brand gradient used for the main call-to-action and the wordmark. */
export const brandGradient = [palette.neonPurple, palette.pink] as const;

export type ColorToken = keyof typeof colors;
