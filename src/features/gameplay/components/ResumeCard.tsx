import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import type { GameModeId } from '@/features/game-modes/registry';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { colors, radius, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface ResumeCardProps {
  modeId: GameModeId;
  /** A mixed round shows its own name instead of the current card's mode. */
  mixed?: boolean;
  level: SpicyLevel;
  playerCount: number;
  round: number;
  onResume: () => void;
}

export function ResumeCard({ modeId, mixed = false, level, playerCount, round, onResume }: ResumeCardProps) {
  const { t } = useTranslation();
  const meta = LEVELS[level];
  return (
    <View style={styles.card} testID="resume-card">
      <LinearGradient
        colors={[`${meta.accent}30`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.stripe, { backgroundColor: meta.accent }]} />
      <View style={styles.text}>
        <AppText variant="overline" color={meta.accent} numberOfLines={1}>
          {`${t('home.resumeOverline')} · ${mixed ? t('mix.title') : t(modeTitleKey(modeId))}`}
        </AppText>
        <AppText variant="bodyStrong">
          {t('home.resumeDetails', {
            level: `${meta.emoji} ${t(meta.nameKey).toLocaleUpperCase()}`,
            players: playerCount,
            round,
          })}
        </AppText>
      </View>
      <Button label={t('home.resume')} onPress={onResume} variant="secondary" size="sm" icon="play" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingLeft: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  text: { flex: 1, gap: spacing.xxs },
});
