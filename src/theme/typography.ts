import type { TextStyle } from 'react-native';

/**
 * Font families are loaded in `src/app/_layout.tsx`.
 * Display: Unbounded (wide, geometric – used for the wordmark & headlines)
 * Body: Manrope (clean, highly legible – used for questions & UI copy)
 */
export const fonts = {
  displayBlack: 'Unbounded_900Black',
  displayBold: 'Unbounded_800ExtraBold',
  displaySemi: 'Unbounded_600SemiBold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyBlack: 'Manrope_800ExtraBold',
} as const;

export const typography = {
  hero: { fontFamily: fonts.displayBlack, fontSize: 44, lineHeight: 48, letterSpacing: 1 },
  h1: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: 0.5 },
  h2: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: 0.4 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 22, letterSpacing: 0.3 },
  question: { fontFamily: fonts.bodyBlack, fontSize: 26, lineHeight: 34 },
  bodyLarge: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bodyBlack,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  button: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20, letterSpacing: 1.6 },
  buttonSmall: { fontFamily: fonts.bodyBlack, fontSize: 13, lineHeight: 18, letterSpacing: 1.2 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
