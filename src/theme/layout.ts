import type { TextStyle } from 'react-native';

import { maxContentWidth } from './spacing';

/**
 * Responsive layout. Wide windows – iPads in portrait or landscape, large Android tablets,
 * desktop browsers – get a wider content column, and text, icons and controls grow by
 * `WIDE_LAYOUT_SCALE`. The decision follows the current window, not the device: an iPad
 * app in a narrow split-screen window keeps the phone layout.
 */
export const WIDE_LAYOUT_MIN_WIDTH = 700;
/** Phones in landscape (web) stay compact – there is not enough height to scale up. */
export const WIDE_LAYOUT_MIN_HEIGHT = 500;
/** Content column on wide windows. */
export const wideContentWidth = 760;
/** Text, icons and controls grow by this factor on wide windows. */
export const WIDE_LAYOUT_SCALE = 1.2;

export interface Layout {
  wide: boolean;
  /** Maximum width of the centred content column. */
  contentWidth: number;
  /** Factor for text, icons and control sizes (1 on phones). */
  scale: number;
}

export const COMPACT_LAYOUT: Layout = { wide: false, contentWidth: maxContentWidth, scale: 1 };
export const WIDE_LAYOUT: Layout = { wide: true, contentWidth: wideContentWidth, scale: WIDE_LAYOUT_SCALE };

export function getLayout(width: number, height: number): Layout {
  return width >= WIDE_LAYOUT_MIN_WIDTH && height >= WIDE_LAYOUT_MIN_HEIGHT ? WIDE_LAYOUT : COMPACT_LAYOUT;
}

/** Scales a size and rounds it to whole points. */
export function scaled(size: number, scale: number): number {
  return scale === 1 ? size : Math.round(size * scale);
}

/** Scales font size, line height and letter spacing of a flattened text style. */
export function scaleTextStyle(style: TextStyle, scale: number): TextStyle {
  if (scale === 1) return style;
  return {
    ...style,
    ...(typeof style.fontSize === 'number' ? { fontSize: Math.round(style.fontSize * scale) } : null),
    ...(typeof style.lineHeight === 'number' ? { lineHeight: Math.round(style.lineHeight * scale) } : null),
    ...(typeof style.letterSpacing === 'number'
      ? { letterSpacing: Math.round(style.letterSpacing * scale * 10) / 10 }
      : null),
  };
}
