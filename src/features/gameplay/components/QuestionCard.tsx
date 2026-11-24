import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { LEVELS } from '@/features/levels/levels';
import { useMotion } from '@/hooks/useMotion';
import { colors, durations, fonts, glow, NATIVE_DRIVER, radius, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface QuestionCardProps {
  /** Changes whenever a new card is dealt – triggers the reveal animation. */
  cardKey: string;
  text: string;
  level: SpicyLevel;
  categoryLabel: string;
  footer: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

function questionFontSize(text: string, width: number): number {
  const base = width < 360 ? 22 : width > 600 ? 30 : 26;
  if (text.length > 110) return base - 4;
  if (text.length > 75) return base - 2;
  return base;
}

export function QuestionCard({
  cardKey,
  text,
  level,
  categoryLabel,
  footer,
  accessibilityLabel,
  style,
}: QuestionCardProps) {
  const meta = LEVELS[level];
  const { width, height } = useWindowDimensions();
  const { enabled: motion } = useMotion();
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!motion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durations.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [cardKey, motion, progress]);

  const fontSize = questionFontSize(text, width);
  const animatedStyle = {
    opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 1] }),
    transform: [
      { perspective: 900 },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
      { rotateX: progress.interpolate({ inputRange: [0, 1], outputRange: ['14deg', '0deg'] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
    ],
  };

  return (
    <Animated.View
      style={[styles.wrapper, glow(meta.accent, 44, 0, '38'), style, animatedStyle]}
      accessible
      aria-label={accessibilityLabel}
      aria-live="polite"
      testID="question-card"
    >
      <LinearGradient
        colors={[`${meta.accent}AA`, 'rgba(255,255,255,0.06)', `${meta.gradient[1]}66`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <LinearGradient
          colors={[meta.tint, colors.surface, colors.backgroundAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={[styles.card, { minHeight: Math.max(220, Math.min(height * 0.38, 400)) }]}
        >
          <AppText style={[styles.watermark, { color: meta.accent }]} aria-hidden maxFontSizeMultiplier={1}>
            ?
          </AppText>
          <View style={styles.topRow}>
            <Chip label={categoryLabel} color={meta.accent} />
            <AppText variant="caption" aria-hidden maxFontSizeMultiplier={1.2}>
              {meta.emoji}
            </AppText>
          </View>
          <View style={styles.body}>
            <AppText
              variant="question"
              align="center"
              style={{ fontSize, lineHeight: Math.round(fontSize * 1.3) }}
              maxFontSizeMultiplier={1.35}
            >
              {text}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted} align="center">
            {footer}
          </AppText>
        </LinearGradient>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.card, maxHeight: 540 },
  border: { flexGrow: 1, borderRadius: radius.card, padding: 1.5 },
  card: {
    flexGrow: 1,
    borderRadius: radius.card - 1,
    padding: spacing.xxl,
    gap: spacing.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  watermark: {
    position: 'absolute',
    right: -10,
    bottom: -60,
    fontFamily: fonts.displayBlack,
    fontSize: 260,
    lineHeight: 300,
    opacity: 0.06,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: spacing.md },
});
