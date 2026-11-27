import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

interface ChipProps {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small label pill. It never grows wider than its row: long labels (large text) wrap. */
export function Chip({ label, color = colors.primary, style }: ChipProps) {
  return (
    <View style={[styles.base, { borderColor: `${color}66`, backgroundColor: `${color}1F` }, style]}>
      <AppText variant="overline" color={color === colors.primary ? colors.text : color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
