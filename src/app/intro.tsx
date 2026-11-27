import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, IconButton, Screen, Surface, type IconName } from '@/components/ui';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useSettingsStore } from '@/store';
import { colors, scaled, spacing } from '@/theme';

interface IntroPage {
  title: TranslationKey;
  emoji: string;
  points: readonly { icon: IconName; text: TranslationKey }[];
}

/** Three short pages: how a round works, the fair-play rules, adjusting level and rounds. */
const PAGES: readonly IntroPage[] = [
  {
    title: 'intro.play.title',
    emoji: '🌶️',
    points: [
      { icon: 'phone-portrait-outline', text: 'intro.play.device' },
      { icon: 'people-outline', text: 'intro.play.turns' },
      { icon: 'albums-outline', text: 'intro.play.modes' },
    ],
  },
  {
    title: 'intro.fair.title',
    emoji: '💜',
    points: [
      { icon: 'hand-left-outline', text: 'intro.fair.pass' },
      { icon: 'water-outline', text: 'intro.fair.alcohol' },
      { icon: 'shield-checkmark-outline', text: 'intro.fair.consent' },
      { icon: 'stop-circle-outline', text: 'intro.fair.stop' },
    ],
  },
  {
    title: 'intro.round.title',
    emoji: '🎛️',
    points: [
      { icon: 'flame-outline', text: 'intro.round.level' },
      { icon: 'shuffle-outline', text: 'intro.round.custom' },
      { icon: 'settings-outline', text: 'intro.round.settings' },
    ],
  },
];

/**
 * Short introduction after the first age confirmation – skippable at any time and
 * available again in the settings (`/intro?replay=1`).
 */
export default function IntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scale, wide } = useLayout();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const completeIntro = useSettingsStore((state) => state.completeIntro);
  const [index, setIndex] = useState(0);
  const page = PAGES[index] ?? PAGES[0]!;
  const last = index === PAGES.length - 1;
  // Opened again from the settings (`/intro?replay=1`): closing returns there.
  const replaying = replay === '1';
  const dot = scaled(8, scale);

  const finish = () => {
    completeIntro();
    if (replaying && router.canGoBack()) router.back();
    else router.replace('/');
  };
  const back = () => {
    if (index > 0) setIndex(index - 1);
    else finish();
  };

  return (
    <Screen
      // Tablets have room to spare: the step sits in the middle instead of at the top.
      contentStyle={wide ? styles.centered : undefined}
      header={
        <View style={styles.topBar}>
          {index > 0 || replaying ? (
            <IconButton icon="chevron-back" label={t('common.back')} onPress={back} />
          ) : (
            <View />
          )}
          {last ? null : (
            <Button label={t('intro.skip')} variant="ghost" size="sm" feedbackEvent={null} onPress={finish} />
          )}
        </View>
      }
      footer={
        <Button
          label={last ? t(replaying ? 'intro.done' : 'intro.start') : t('intro.next')}
          icon={last ? 'flame' : 'arrow-forward'}
          feedbackEvent={last ? 'level' : 'tap'}
          onPress={last ? finish : () => setIndex(index + 1)}
          testID="intro-next"
        />
      }
    >
      {/* Announced when the page changes, so screen reader users hear the new step. */}
      <View style={styles.page} aria-live="polite" testID={`intro-page-${index + 1}`}>
        <View style={styles.dots} aria-hidden>
          {PAGES.map((item, dotIndex) => (
            <View
              key={item.title}
              style={[
                styles.dot,
                { width: dotIndex === index ? dot * 3 : dot, height: dot, borderRadius: dot / 2 },
                dotIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <AppText variant="hero" aria-hidden>
          {page.emoji}
        </AppText>
        <View style={styles.titles}>
          <AppText variant="overline" color={colors.accent}>
            {t('intro.progress', { current: index + 1, total: PAGES.length })}
          </AppText>
          <AppText variant="h1" role="heading">
            {t(page.title)}
          </AppText>
        </View>
        <Surface style={styles.points}>
          {page.points.map((point) => (
            <View key={point.text} style={styles.point}>
              <View style={styles.iconBox}>
                <Icon name={point.icon} size={20} color={colors.accent} />
              </View>
              <AppText variant="body" style={styles.pointText}>
                {t(point.text)}
              </AppText>
            </View>
          ))}
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  page: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: { backgroundColor: colors.textMuted, opacity: 0.5 },
  dotActive: { backgroundColor: colors.accent, opacity: 1 },
  titles: { gap: spacing.xs },
  points: { gap: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  pointText: { flex: 1 },
});
