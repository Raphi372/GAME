/** 4pt spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  card: 32,
  pill: 999,
} as const;

/** Content never grows wider than this (tablets, web). */
export const maxContentWidth = 560;

/** Minimum touch target size (Apple HIG / Material). */
export const minTouchSize = 48;
