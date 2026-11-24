import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip, Icon } from '@/components/ui';
import { usePressScale } from '@/components/ui/usePressScale';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, radius, spacing } from '@/theme';

import { cardCountKey, modeTaglineKey, modeTitleKey } from './labels';
import type { GameModeDefinition } from './registry';

interface ModeCardProps {
  mode: GameModeDefinition;
  questionCount?: number;
  onPress: () => void;
}

export function ModeCard({ mode, questionCount, onPress }: ModeCardProps) {
  const { t } = useTranslation();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const title = t(modeTitleKey(mode.id));
  const tagline = t(modeTaglineKey(mode.id));
  const available = mode.status === 'available';

  const body = (
    <View style={[styles.card, available ? styles.available : styles.unavailable]}>
      <View style={[styles.emojiBox, available && styles.emojiBoxActive]}>
        <AppText variant="h2" aria-hidden maxFontSizeMultiplier={1}>
          {mode.emoji}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="h3" color={available ? colors.text : colors.textSecondary}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
          {available && questionCount
            ? `${tagline} · ${t(cardCountKey(mode.id), { count: questionCount })}`
            : tagline}
        </AppText>
      </View>
      {available ? (
        <Icon name="arrow-forward" size={20} color={colors.accent} />
      ) : (
        <Chip label={t('common.comingSoon')} color={colors.textMuted} />
      )}
    </View>
  );

  if (!available) {
    return (
      <View accessible aria-disabled aria-label={t('mode.comingSoonA11y', { title })}>
        {body}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        role="button"
        aria-label={`${title}. ${tagline}`}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          feedback('tap');
          onPress();
        }}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  available: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
  unavailable: { backgroundColor: 'rgba(21, 17, 28, 0.6)', borderColor: colors.border },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiBoxActive: { backgroundColor: colors.primarySoft },
  text: { flex: 1, gap: spacing.xxs },
});
