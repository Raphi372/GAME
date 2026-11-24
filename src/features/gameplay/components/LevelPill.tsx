import { Pressable, StyleSheet } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, minTouchSize, radius, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface LevelPillProps {
  level: SpicyLevel;
  onPress: () => void;
}

export function LevelPill({ level, onPress }: LevelPillProps) {
  const { t } = useTranslation();
  const meta = LEVELS[level];
  const name = t(meta.nameKey).toLocaleUpperCase();
  return (
    <Pressable
      role="button"
      aria-label={t('game.levelButton', { level: name })}
      onPress={() => {
        feedback('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: `${meta.accent}88`, backgroundColor: `${meta.accent}1F` },
        pressed && styles.pressed,
      ]}
      testID="level-pill"
    >
      <AppText variant="caption" aria-hidden maxFontSizeMultiplier={1.1}>
        {meta.emoji}
      </AppText>
      <AppText variant="buttonSmall" color={colors.text} maxFontSizeMultiplier={1.2}>
        {name}
      </AppText>
      <Icon name="chevron-down" size={16} color={meta.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.75 },
});
