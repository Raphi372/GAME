import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Avatar, Button, Screen, SectionTitle, Surface } from '@/components/ui';
import { DEFAULT_MODE_ID, DEFAULT_SINGLE_COPY, getGameMode, MIX_EMOJI, MIX_PARAM } from '@/features/game-modes/registry';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function SummaryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const result = useGameStore((state) => state.lastResult);
  const { width, fontScale } = useWindowDimensions();
  // Large system text or a very narrow screen: one tile per row, so long labels like
  // "GESTÄNDNISSE" keep fitting.
  const singleColumn = width < 360 || fontScale >= 1.2;

  if (!result) return <Redirect href="/" />;

  const meta = LEVELS[result.level];
  const mixed = result.mixed;
  const mode = getGameMode(mixed ? DEFAULT_MODE_ID : result.modeId);
  const group = mixed ? undefined : mode.group;
  const isChoice = !mixed && Boolean(mode.choice);
  const single = mode.singleCopy ?? DEFAULT_SINGLE_COPY;
  // Mixed rounds show the counters of the modes that were part of the round.
  const mixHas = {
    single: result.modeIds.some((id) => getGameMode(id).turnStyle === 'single-player'),
    confessions: result.modeIds.some((id) => getGameMode(id).group?.tally === 'confessed'),
    picks: result.modeIds.some((id) => getGameMode(id).group?.tally === 'picked'),
  };
  const totals = result.players.reduce(
    (sum, player) => ({
      answered: sum.answered + player.answered,
      passed: sum.passed + player.passed,
      skipped: sum.skipped + player.skipped,
      tally: sum.tally + (group ? player[group.tally] : 0),
      truths: sum.truths + player.truths,
      dares: sum.dares + player.dares,
      confessed: sum.confessed + player.confessed,
      picked: sum.picked + player.picked,
    }),
    { answered: 0, passed: 0, skipped: 0, tally: 0, truths: 0, dares: 0, confessed: 0, picked: 0 },
  );
  // Spicy Questions ranks by answered questions, group modes by their tally,
  // "Wahrheit oder Pflicht" by dares done, a mixed round by answers plus confessions.
  const score = (player: (typeof result.players)[number]) =>
    mixed
      ? player.answered + player.confessed
      : group
      ? player[group.tally]
      : isChoice
      ? player.dares
      : player.answered;
  const ranked = [...result.players].sort((a, b) => score(b) - score(a));
  const best = Math.max(0, ...result.players.map(score));
  // Everyone with the highest score – a tie names all of them.
  const leaders = best > 0 ? result.players.filter((player) => score(player) === best) : [];
  const minutes = Math.max(1, Math.round(result.durationMs / 60000));

  const stats = mixed
    ? [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        ...(mixHas.single ? [{ label: t('summary.answered'), value: totals.answered }] : []),
        ...(mixHas.confessions ? [{ label: t('summary.confessions'), value: totals.confessed }] : []),
        ...(mixHas.picks ? [{ label: t('summary.picks'), value: totals.picked }] : []),
        ...(mixHas.single ? [{ label: t('summary.passed'), value: totals.passed }] : []),
      ]
    : isChoice
    ? [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        { label: t('summary.truths'), value: totals.truths },
        { label: t('summary.dares'), value: totals.dares },
        { label: t('summary.passed'), value: totals.passed },
      ]
    : group
    ? [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        { label: t(group.copy.summaryStat), value: totals.tally },
        { label: t('summary.skipped'), value: totals.skipped },
      ]
    : [
        { label: t('summary.rounds'), value: result.turnsCompleted },
        { label: t(single.summaryAnswered), value: totals.answered },
        { label: t('summary.passed'), value: totals.passed },
        { label: t('summary.skipped'), value: totals.skipped },
      ];

  return (
    <Screen
      // Only text in the scroll area: keyboard users (web) scroll it via focus.
      focusableScroll
      accent={meta.gradient[0]}
      secondaryAccent={meta.gradient[1]}
      footer={
        <>
          <Button
            label={t('summary.playAgain')}
            icon="refresh"
            gradient={meta.gradient}
            onPress={() =>
              router.replace({ pathname: '/level', params: { mode: result.mixed ? MIX_PARAM : result.modeId } })
            }
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
        {/* Own line for the mixed round, so the details below fit on one line on phones. */}
        {result.mixed ? (
          <AppText variant="caption" color={colors.textMuted} align="center">
            {`${MIX_EMOJI} ${t('mix.title')}`}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textMuted} align="center">
          {`${meta.emoji} ${t(meta.nameKey).toLocaleUpperCase()} · ${t('summary.duration', { minutes })}`}
        </AppText>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <Surface key={stat.label} style={[styles.stat, singleColumn && styles.statFull]} testID="summary-stat">
            <AppText style={styles.statValue} color={colors.text} maxFontSizeMultiplier={1.2}>
              {String(stat.value)}
            </AppText>
            <AppText variant="overline" color={colors.textMuted}>
              {stat.label}
            </AppText>
          </Surface>
        ))}
      </View>

      {leaders.length > 0 ? (
        <Surface style={[styles.daring, { borderColor: `${meta.accent}66` }]}>
          <View style={styles.leaderAvatars}>
            {leaders.slice(0, 3).map((leader, index) => (
              <View key={leader.id} style={index > 0 ? styles.leaderOverlap : null}>
                <Avatar name={leader.name} colorIndex={leader.colorIndex} size={leaders.length > 1 ? 40 : 48} />
              </View>
            ))}
          </View>
          <View style={styles.flex}>
            <AppText variant="overline" color={meta.accent}>
              {`🏆 ${t(group ? group.copy.summaryTop : isChoice ? 'summary.mostDares' : single.summaryTop)}`}
            </AppText>
            <AppText variant="h2">{leaders.map((leader) => leader.name).join(' & ')}</AppText>
          </View>
        </Surface>
      ) : null}

      <SectionTitle>{t('summary.playersTitle')}</SectionTitle>
      <View style={styles.players}>
        {ranked.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <Avatar name={player.name} colorIndex={player.colorIndex} size={40} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {player.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {mixed
                  ? [
                      mixHas.single ? t('summary.mixAnswered', { count: player.answered }) : null,
                      mixHas.confessions ? t('summary.mixConfessed', { count: player.confessed }) : null,
                      mixHas.picks
                        ? player.picked === 1
                          ? t('summary.pickLineOne')
                          : t('summary.pickLine', { count: player.picked })
                        : null,
                      mixHas.single ? t('summary.mixPassed', { count: player.passed }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : isChoice
                  ? t('summary.todLine', { truths: player.truths, dares: player.dares, passed: player.passed })
                  : group
                  ? player[group.tally] === 1
                    ? t(group.copy.summaryLineOne)
                    : t(group.copy.summaryLine, { count: player[group.tally] })
                  : t(single.summaryLine, { answered: player.answered, passed: player.passed })}
              </AppText>
            </View>
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
  statFull: { flexBasis: '100%' },
  statValue: { fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 40 },
  daring: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  leaderAvatars: { flexDirection: 'row' },
  leaderOverlap: { marginLeft: -12 },
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
