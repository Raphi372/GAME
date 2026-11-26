import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { cardCountKey } from '@/features/game-modes/labels';
import type { GameModeId } from '@/features/game-modes/registry';
import { usePressScale } from '@/components/ui/usePressScale';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, glow, radius, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

import { levelDescriptionKey, LEVELS } from '../levels';

interface LevelCardProps {
  level: SpicyLevel;
  selected: boolean;
  onPress: () => void;
  questionCount: number;
  /** The players' own cards for this level (shown as "+ 3 eigene"). */
  customCount?: number;
  compact?: boolean;
  modeId?: GameModeId;
  testID?: string;
}

export function LevelCard({
  level,
  selected,
  onPress,
  questionCount,
  customCount = 0,
  compact = false,
  modeId = 'spicy-questions',
  testID,
}: LevelCardProps) {
  const { t } = useTranslation();
  const meta = LEVELS[level];
  const { scale, onPressIn, onPressOut } = usePressScale(0.975);
  const name = t(meta.nameKey);
  const tagline = t(meta.taglineKey);
  const description = t(levelDescriptionKey(level, modeId));
  const builtInCount = t(cardCountKey(modeId), { count: questionCount });
  const count =
    customCount > 0 ? `${builtInCount} ${t('level.customSuffix', { count: customCount })}` : builtInCount;

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, selected ? glow(meta.accent, 28, 0, '59') : null, styles.outer]}
    >
      <Pressable
        role="radio"
        aria-checked={selected}
        aria-label={`${name}. ${tagline} ${compact ? '' : description} ${count}`.trim()}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          feedback('select');
          onPress();
        }}
        testID={testID}
      >
        <LinearGradient
          colors={
            selected
              ? [meta.gradient[0], meta.gradient[1]]
              : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.border}
        >
          <View style={[styles.inner, compact && styles.innerCompact]}>
            <LinearGradient
              colors={[`${meta.accent}${selected ? '33' : '14'}`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <AppText variant="caption" style={styles.emoji} aria-hidden maxFontSizeMultiplier={1.2}>
                  {meta.emoji}
                </AppText>
                <AppText variant={compact ? 'h3' : 'h2'}>{name.toLocaleUpperCase()}</AppText>
                <AppText variant="bodyStrong" color={meta.accent}>
                  {tagline}
                </AppText>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? meta.accent : colors.borderStrong },
                  selected && { backgroundColor: meta.accent },
                ]}
              >
                {selected ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}
              </View>
            </View>
            {compact ? null : (
              <>
                <AppText variant="body" color={colors.textSecondary}>
                  {description}
                </AppText>
                <AppText variant="overline" color={colors.textMuted}>
                  {count}
                </AppText>
              </>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radius.lg + 2 },
  border: { borderRadius: radius.lg + 2, padding: 1.5 },
  inner: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  innerCompact: { paddingVertical: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xxs },
  emoji: { fontSize: 18, lineHeight: 24, marginBottom: spacing.xxs },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
