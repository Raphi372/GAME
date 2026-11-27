import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip, Icon } from '@/components/ui';
import { usePressScale } from '@/components/ui/usePressScale';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, radius, scaled, spacing } from '@/theme';

import { cardCountKey, modeTaglineKey, modeTitleKey } from './labels';
import type { GameModeDefinition } from './registry';

interface ModeCardProps {
  mode: GameModeDefinition;
  questionCount?: number;
  onPress: () => void;
}

const EMOJI_BOX = 52;

/** A game mode on the home screen. */
export function ModeCard({ mode, questionCount, onPress }: ModeCardProps) {
  const { t } = useTranslation();
  const available = mode.status === 'available';
  return (
    <ModeTile
      emoji={mode.emoji}
      title={t(modeTitleKey(mode.id))}
      tagline={t(modeTaglineKey(mode.id))}
      detail={available && questionCount ? t(cardCountKey(mode.id), { count: questionCount }) : undefined}
      available={available}
      onPress={onPress}
    />
  );
}

interface ModeTileProps {
  emoji: string;
  title: string;
  tagline: string;
  /** E.g. the number of cards, shown after the tagline. */
  detail?: string;
  available?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Card layout shared by the game modes and the mixed round. */
export function ModeTile({ emoji, title, tagline, detail, available = true, onPress, testID }: ModeTileProps) {
  const { t } = useTranslation();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const box = scaled(EMOJI_BOX, useLayout().scale);

  const body = (
    <View style={[styles.card, available ? styles.available : styles.unavailable]}>
      <View style={[styles.emojiBox, { width: box, height: box }, available && styles.emojiBoxActive]}>
        <AppText variant="h2" aria-hidden maxFontSizeMultiplier={1}>
          {emoji}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="h3" color={available ? colors.text : colors.textSecondary}>
          {title}
        </AppText>
        {/* No line limit: with large system text the description wraps instead of being cut. */}
        <AppText variant="caption" color={colors.textMuted}>
          {detail ? `${tagline} · ${detail}` : tagline}
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
        testID={testID}
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
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiBoxActive: { backgroundColor: colors.primarySoft },
  text: { flex: 1, gap: spacing.xxs },
});
