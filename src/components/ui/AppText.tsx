import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

const DISPLAY_VARIANTS: readonly TypographyVariant[] = ['hero', 'h1', 'h2', 'h3', 'button', 'question'];
export const TEXT_MAX_SCALE = 2;
export const DISPLAY_MAX_SCALE = 1.25;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

/**
 * Text with design-system typography. Body text follows the system text size up to 200 %
 * (WCAG 1.4.4); large display styles (20–44 px already) cap at 125 % so long German words
 * in headlines are not broken in the middle.
 */
export function AppText({
  variant = 'body',
  color = colors.text,
  align,
  style,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  const isDisplay = DISPLAY_VARIANTS.includes(variant);
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isDisplay ? DISPLAY_MAX_SCALE : TEXT_MAX_SCALE)}
      style={[typography[variant], { color }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
