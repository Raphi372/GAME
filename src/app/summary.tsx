import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Screen, SectionTitle, Surface } from '@/components/ui';
import { getGameMode } from '@/features/game-modes/registry';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function SummaryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const result = useGameStore((state) => state.lastResult);

  if (!result) return <Redirect href="/" />;

  const meta = LEVELS[result.level];
  const isGroup = getGameMode(result.modeId).turnStyle === 'group';
  const totals = result.players.reduce(
    (sum, player) => ({
      answered: sum.answered + player.answered,
      passed: sum.passed + player.passed,
      skipped: sum.skipped + player.skipped,
      confessed: sum.confessed + player.confessed,
    }),
    { answered: 0, passed: 0, skipped: 0, confessed: 0 },
  );
  // Spicy Questions ranks by answered questions, group modes by confessions.
  const score = (player: (typeof result.players)[number]) =>
    isGroup ? player.confessed : player.answered;
  const ranked = [...result.players].sort((a, b) => score(b) - score(a));
  const top = ranked[0] && score(ranked[0]) > 0 ? ranked[0] : null;
  const minutes = Math.max(1, Math.round(result.durationMs / 60000));

  const stats = isGroup
    ? [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        { label: t('summary.confessions'), value: totals.confessed },
        { label: t('summary.skipped'), value: totals.skipped },
      ]
    : [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        { label: t('summary.answered'), value: totals.answered },
        { label: t('summary.passed'), value: totals.passed },
        { label: t('summary.skipped'), value: totals.skipped },
      ];

  return (
    <Screen
      accent={meta.gradient[0]}
      secondaryAccent={meta.gradient[1]}
      footer={
        <>
          <Button
            label={t('summary.playAgain')}
            icon="refresh"
            gradient={meta.gradient}
            onPress={() => router.replace({ pathname: '/level', params: { mode: result.modeId } })}
          />
          <Button
            label={t('summary.home')}
            variant="ghost"
            size="md"
            onPress={() => router.dismissTo('/')}
          />
        </>
      }
    >
      <View style={styles.hero}>
        <AppText variant="hero" align="center" aria-hidden>
          🌙
        </AppText>
        <AppText variant="overline" color={meta.accent} align="center">
          {t('summary.overline')}
        </AppText>
        <AppText variant="h1" align="center" role="heading">
          {t('summary.title')}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} align="center">
          {`${meta.emoji} ${t(meta.nameKey).toLocaleUpperCase()} · ${t('summary.duration', { minutes })}`}
        </AppText>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <Surface key={stat.label} style={styles.stat}>
            <AppText style={styles.statValue} color={colors.text} maxFontSizeMultiplier={1.2}>
              {String(stat.value)}
            </AppText>
            <AppText variant="overline" color={colors.textMuted}>
              {stat.label}
            </AppText>
          </Surface>
        ))}
      </View>

      {top ? (
        <Surface style={[styles.daring, { borderColor: `${meta.accent}66` }]}>
          <Avatar name={top.name} colorIndex={top.colorIndex} size={48} />
          <View style={styles.flex}>
            <AppText variant="overline" color={meta.accent}>
              {`🏆 ${t(isGroup ? 'summary.mostConfessions' : 'summary.mostDaring')}`}
            </AppText>
            <AppText variant="h2">{top.name}</AppText>
          </View>
        </Surface>
      ) : null}

      <SectionTitle>{t('summary.playersTitle')}</SectionTitle>
      <View style={styles.players}>
        {ranked.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <Avatar name={player.name} colorIndex={player.colorIndex} size={40} />
            <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {player.name}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {isGroup
                ? player.confessed === 1
                  ? t('summary.confessionLineOne')
                  : t('summary.confessionLine', { count: player.confessed })
                : t('summary.playerLine', { answered: player.answered, passed: player.passed })}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: spacing.xs },
  statValue: { fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 40 },
  daring: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  flex: { flex: 1 },
  players: { gap: spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
