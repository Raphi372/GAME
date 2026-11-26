import { StyleSheet, View } from 'react-native';

import { avatarColor, initials } from '@/features/players/validation';
import { useLayout } from '@/hooks/useLayout';
import { blend, colors, fonts, readableOnDark, scaled } from '@/theme';

import { AppText } from './AppText';

interface AvatarProps {
  name: string;
  colorIndex: number;
  size?: number;
}

export const AVATAR_TEXT_CONTRAST = 6;

export function Avatar({ name, colorIndex, size = 44 }: AvatarProps) {
  const color = avatarColor(colorIndex);
  // The initials are scaled by AppText – the circle grows with them.
  const box = scaled(size, useLayout().scale);
  // Initials sit on a translucent tint of the same colour – lighten them where needed.
  // 6:1 on a plain surface keeps them ≥ 4.5:1 on accent-tinted chips as well.
  const textColor = readableOnDark(
    color,
    blend(color, colors.surfaceRaised, 0x2e / 255),
    AVATAR_TEXT_CONTRAST,
  );
  return (
    <View
      aria-hidden
      style={[
        styles.base,
        {
          width: box,
          height: box,
          borderRadius: box / 2,
          backgroundColor: `${color}2E`,
          borderColor: `${color}AA`,
        },
      ]}
    >
      <AppText
        style={{ fontFamily: fonts.displayBold, fontSize: size * 0.36, lineHeight: size * 0.46 }}
        color={textColor}
        maxFontSizeMultiplier={1}
      >
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
