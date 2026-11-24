import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

const DISPLAY_VARIANTS: readonly TypographyVariant[] = ['hero', 'h1', 'h2', 'h3', 'button', 'question'];

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

/** Text with design-system typography. Large display styles cap font scaling to keep layouts intact. */
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
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isDisplay ? 1.25 : 1.6)}
      style={[typography[variant], { color }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
