import type { Ref } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewInstance } from 'react-native';

import { AmbientBackground } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import { MIX_EMOJI } from '@/features/game-modes/registry';
import type { Summary } from '@/features/summary/summaryModel';
import { useTranslation } from '@/i18n';
import type { GameResult } from '@/store';
import { colors, fonts, palette } from '@/theme';

/** The image is designed – and captured – at this size in points: 4:5 like a portrait post. */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 450;
/** Two rows of tiles; a mixed round with five counters leaves out the passed cards. */
const MAX_STATS = 4;

interface ResultShareCardProps {
  result: GameResult;
  summary: Summary;
  /** Show who led the round – only when everybody agreed. */
  showNames: boolean;
  ref?: Ref<ViewInstance>;
}

/** Ends a part of the description with a full stop unless it already ends a sentence. */
const sentence = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** What the picture shows, also used as its description for screen readers. */
function useShareCardContent(result: GameResult, summary: Summary, showNames: boolean) {
  const { t } = useTranslation();
  const { meta } = summary;
  const modeTitle = summary.mixed ? t('mix.title') : t(modeTitleKey(summary.mode.id));
  const levelName = t(meta.nameKey).toLocaleUpperCase();
  const players = t('share.players', { count: result.players.length });
  const minutes = t('share.minutes', { minutes: summary.minutes });
  const stats = summary.stats.slice(0, MAX_STATS).map((stat) => ({ label: t(stat.label), value: stat.value }));
  const highlight =
    showNames && summary.leaders.length > 0
      ? { title: t(summary.topLabel), names: summary.leaders.map((leader) => leader.name).join(' & ') }
      : null;
  const description = [
    `${t('app.name')} – ${t('summary.title')}`,
    [modeTitle, t(meta.nameKey), players, minutes].join(', '),
    // "Runden: 18" – no grammatical number to agree with, in any language.
    stats.map((stat) => `${stat.label}: ${stat.value}`).join(', '),
    highlight ? `${highlight.title}: ${highlight.names}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .map(sentence)
    .join(' ');

  return {
    modeLine: `${summary.mixed ? MIX_EMOJI : summary.mode.emoji} ${modeTitle}`,
    detailLine: [`${meta.emoji} ${levelName}`, players, minutes].join(' · '),
    stats,
    highlight,
    accessibilityLabel: t('share.preview', { content: description }),
  };
}

/** Fixed sizes, independent of the system text size: the picture looks the same everywhere. */
function CardText({ style, lines, children }: { style: StyleProp<TextStyle>; lines?: number; children: string }) {
  return (
    <Text style={style} numberOfLines={lines} allowFontScaling={false}>
      {children}
    </Text>
  );
}

/**
 * The result of a round as a picture to share: mode, level, numbers – names only when
 * `showNames` is on. Rendered at its design size; the share sheet scales the preview.
 */
export function ResultShareCard({ result, summary, showNames, ref }: ResultShareCardProps) {
  const { t } = useTranslation();
  const { meta } = summary;
  const content = useShareCardContent(result, summary, showNames);

  return (
    <View
      ref={ref}
      // Android: keep a real view to capture.
      collapsable={false}
      style={styles.card}
      accessible
      role="img"
      aria-label={content.accessibilityLabel}
      testID="share-card"
    >
      <AmbientBackground accent={meta.gradient[0]} secondary={meta.gradient[1]} intensity={1.15} />

      <View style={styles.brand}>
        <CardText style={[styles.word, styles.spicy]}>SPICY</CardText>
        <CardText style={[styles.word, styles.night]}>NIGHT</CardText>
      </View>

      <View style={styles.heading}>
        <CardText style={[styles.overline, { color: meta.accent }]} lines={1}>
          {t('summary.overline')}
        </CardText>
        <CardText style={styles.title} lines={2}>
          {t('summary.title')}
        </CardText>
        <CardText style={styles.detail} lines={1}>
          {content.modeLine}
        </CardText>
        <CardText style={styles.detail} lines={2}>
          {content.detailLine}
        </CardText>
      </View>

      <View style={styles.stats}>
        {content.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <CardText style={styles.statValue} lines={1}>
              {String(stat.value)}
            </CardText>
            <CardText style={styles.statLabel} lines={1}>
              {stat.label}
            </CardText>
          </View>
        ))}
      </View>

      {content.highlight ? (
        <View style={[styles.highlight, { borderColor: `${meta.accent}80` }]} testID="share-card-names">
          <CardText style={[styles.overline, { color: meta.accent }]} lines={1}>
            {`🏆 ${content.highlight.title}`}
          </CardText>
          <CardText style={styles.names} lines={2}>
            {content.highlight.names}
          </CardText>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <CardText style={styles.claim} lines={1}>
          {t('app.claim')}
        </CardText>
        <View style={styles.footerLine} />
      </View>
    </View>
  );
}

const WORD_SIZE = 28;

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  brand: { alignItems: 'center' },
  word: { fontFamily: fonts.displayBlack, fontSize: WORD_SIZE, lineHeight: WORD_SIZE * 1.08 },
  spicy: {
    color: palette.white,
    letterSpacing: WORD_SIZE * 0.08,
    textShadowColor: 'rgba(177, 77, 255, 0.9)',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  night: {
    color: palette.pink,
    marginTop: -3,
    letterSpacing: WORD_SIZE * 0.16,
    textShadowColor: 'rgba(255, 61, 154, 0.85)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  heading: { alignItems: 'center', gap: 4 },
  overline: {
    fontFamily: fonts.bodyBlack,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.4,
    color: colors.text,
    textAlign: 'center',
  },
  detail: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1,
    flexBasis: '40%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statValue: { fontFamily: fonts.displayBlack, fontSize: 28, lineHeight: 32, color: colors.text },
  statLabel: {
    fontFamily: fonts.bodyBlack,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  highlight: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  names: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
    textAlign: 'center',
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  footerLine: { width: 24, height: 1, backgroundColor: 'rgba(212, 168, 255, 0.4)' },
  claim: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
});
