import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, palette } from '@/theme';

interface AmbientBackgroundProps {
  /** Main glow colour (top). */
  accent?: string;
  /** Secondary glow colour (bottom). */
  secondary?: string;
  intensity?: number;
}

/** Dark luxury background with two soft neon glows. Static (no animation cost). */
export function AmbientBackground({
  accent = palette.neonPurple,
  secondary = palette.pink,
  intensity = 1,
}: AmbientBackgroundProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`top${id}`} cx="18%" cy="4%" r="70%" fx="18%" fy="4%">
            <Stop offset="0" stopColor={accent} stopOpacity={0.42 * intensity} />
            <Stop offset="0.55" stopColor={accent} stopOpacity={0.08 * intensity} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`bottom${id}`} cx="92%" cy="96%" r="65%" fx="92%" fy="96%">
            <Stop offset="0" stopColor={secondary} stopOpacity={0.3 * intensity} />
            <Stop offset="0.6" stopColor={secondary} stopOpacity={0.05 * intensity} />
            <Stop offset="1" stopColor={secondary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#top${id})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#bottom${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.background },
});
