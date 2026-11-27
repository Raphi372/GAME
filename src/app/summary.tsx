import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Avatar, Button, Screen, SectionTitle, Surface } from '@/components/ui';
import { MIX_EMOJI, MIX_PARAM } from '@/features/game-modes/registry';
import { canShareResultImage, releaseResultImage } from '@/features/share/shareImage';
import { ShareResultSheet } from '@/features/share/ShareResultSheet';
import { summarize } from '@/features/summary/summaryModel';
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
  // Native apps only: the web build has no image capture.
  const [canShare] = useState(canShareResultImage);
  const [shareOpen, setShareOpen] = useState(false);
  // A new sheet for every opening: names start hidden each time.
  const [shareKey, setShareKey] = useState(0);
  // The shared picture is only needed while the summary is open.
  useEffect(() => releaseResultImage, []);

  if (!result) return <Redirect href="/" />;

  const summary = summarize(result);
  const { meta, mixed, group, isChoice, single, mixHas, ranked, leaders, minutes } = summary;
  const stats = summary.stats.map((stat) => ({ label: t(stat.label), value: stat.value }));

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
              {`🏆 ${t(summary.topLabel)}`}
            </AppText>
            <AppText variant="h2">{leaders.map((leader) => leader.name).join(' & ')}</AppText>
          </View>
        </Surface>
      ) : null}

      {canShare ? (
        <Button
          label={t('share.button')}
          hint={t('share.buttonHint')}
          icon={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
          variant="secondary"
          size="md"
          style={styles.share}
          onPress={() => {
            setShareKey((key) => key + 1);
            setShareOpen(true);
          }}
          testID="share-open"
        />
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

      {canShare ? (
        <ShareResultSheet
          key={shareKey}
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          result={result}
          summary={summary}
        />
      ) : null}
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
  share: { marginTop: spacing.lg },
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
