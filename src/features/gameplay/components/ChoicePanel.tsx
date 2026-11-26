import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Icon, type IconName } from '@/components/ui';
import { usePressScale } from '@/components/ui/usePressScale';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation, type TranslationKey } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, fonts, glow, radius, spacing } from '@/theme';
import type { CardKind } from '@/types';

interface KindStyle {
  label: TranslationKey;
  hint: TranslationKey;
  icon: IconName;
  gradient: readonly [string, string];
}

const TILE_MIN_HEIGHT = 200;
/** Tablets: big tiles to tap, so the choice fills the screen like a card does. */
const TILE_MIN_HEIGHT_WIDE = 320;

const KINDS: Record<CardKind, KindStyle> = {
  truth: {
    label: 'tod.truth',
    hint: 'tod.truthHint',
    icon: 'chatbubble-ellipses',
    gradient: ['#7C5CFF', '#4D7DFF'],
  },
  dare: {
    label: 'tod.dare',
    hint: 'tod.dareHint',
    icon: 'flash',
    gradient: ['#FF3D9A', '#FF2D55'],
  },
};

interface ChoicePanelProps {
  kinds: readonly CardKind[];
  remaining: Record<CardKind, number>;
  onChoose: (kind: CardKind) => void;
}

function ChoiceTile({
  kind,
  remaining,
  onChoose,
}: {
  kind: CardKind;
  remaining: number;
  onChoose: (kind: CardKind) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const style = KINDS[kind];
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  const layout = useLayout();
  // Wide display font: scale the label with the tile width so it never gets cut off.
  const labelSize = width < 360 ? 13 : 17;
  const disabled = remaining === 0;
  const label = t(style.label);
  const hint = t(style.hint);

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        { transform: [{ scale }] },
        disabled ? styles.disabled : glow(style.gradient[1], 30, 0, '55'),
      ]}
    >
      <Pressable
        role="button"
        aria-label={t('tod.chooseA11y', { kind: label, hint, count: remaining })}
        aria-disabled={disabled}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          feedback('reveal');
          onChoose(kind);
        }}
        testID={`choose-${kind}`}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[style.gradient[0], style.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tile, { minHeight: layout.wide ? TILE_MIN_HEIGHT_WIDE : TILE_MIN_HEIGHT }]}
        >
          <Icon name={style.icon} size={34} color={colors.textOnAccent} />
          <AppText
            color={colors.textOnAccent}
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.1}
            style={[
              styles.label,
              { fontSize: labelSize, lineHeight: labelSize + 6, letterSpacing: width < 360 ? 0.3 : 0.8 },
            ]}
          >
            {label.toLocaleUpperCase()}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)" align="center">
            {hint}
          </AppText>
          <AppText variant="overline" color="rgba(255,255,255,0.75)" align="center">
            {disabled ? t('tod.kindExhausted') : t('tod.remaining', { count: remaining })}
          </AppText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/** "Wahrheit oder Pflicht?" – the active player picks the kind of the next card. */
export function ChoicePanel({ kinds, remaining, onChoose }: ChoicePanelProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container} testID="choice-panel">
      <AppText variant="h2" align="center" role="heading">
        {t('tod.chooseTitle')}
      </AppText>
      <View style={styles.row}>
        {kinds.map((kind) => (
          <ChoiceTile key={kind} kind={kind} remaining={remaining[kind]} onChoose={onChoose} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingTop: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  tileWrap: { flex: 1, borderRadius: radius.xl },
  pressable: { borderRadius: radius.xl, overflow: 'hidden' },
  tile: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  label: { fontFamily: fonts.displayBold },
  disabled: { opacity: 0.35 },
});
