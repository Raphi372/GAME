import { StyleSheet, View } from 'react-native';

import { avatarColor, initials } from '@/features/players/validation';
import { fonts } from '@/theme';

import { AppText } from './AppText';

interface AvatarProps {
  name: string;
  colorIndex: number;
  size?: number;
}

export function Avatar({ name, colorIndex, size = 44 }: AvatarProps) {
  const color = avatarColor(colorIndex);
  return (
    <View
      aria-hidden
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}2E`,
          borderColor: `${color}AA`,
        },
      ]}
    >
      <AppText
        style={{ fontFamily: fonts.displayBold, fontSize: size * 0.36, lineHeight: size * 0.46 }}
        color={color}
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
