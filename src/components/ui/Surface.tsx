import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface SurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Elevated content container (cards, settings groups). */
export function Surface({ children, style, testID }: SurfaceProps) {
  return (
    <View style={[styles.base, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(23, 18, 31, 0.86)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
