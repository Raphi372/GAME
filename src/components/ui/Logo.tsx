import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, fonts, palette, spacing } from '@/theme';

import { AppText } from './AppText';

interface LogoProps {
  size?: 'lg' | 'md' | 'sm';
  showClaim?: boolean;
}

const SIZES = { lg: 54, md: 38, sm: 24 } as const;

/** Typographic SPICY NIGHT wordmark with neon glow. */
export function Logo({ size = 'lg', showClaim = true }: LogoProps) {
  const { t } = useTranslation();
  const fontSize = SIZES[size];
  const word = { fontFamily: fonts.displayBlack, fontSize, lineHeight: fontSize * 1.08 };

  return (
    <View
      style={styles.container}
      accessible
      role="heading"
      aria-label={`${t('app.name')}. ${t('app.claim')}`}
    >
      <AppText
        style={[word, styles.spicy, { letterSpacing: fontSize * 0.08 }]}
        maxFontSizeMultiplier={1}
      >
        SPICY
      </AppText>
      <AppText
        style={[word, styles.night, { letterSpacing: fontSize * 0.16 }]}
        maxFontSizeMultiplier={1}
      >
        NIGHT
      </AppText>
      {showClaim ? (
        <View style={styles.claimRow}>
          <View style={styles.line} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.claim}>
            {t('app.claim')}
          </AppText>
          <View style={styles.line} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  spicy: {
    color: palette.white,
    textShadowColor: 'rgba(177, 77, 255, 0.9)',
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  night: {
    color: palette.pink,
    marginTop: -4,
    textShadowColor: 'rgba(255, 61, 154, 0.85)',
    textShadowRadius: 26,
    textShadowOffset: { width: 0, height: 0 },
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  line: { width: 28, height: 1, backgroundColor: 'rgba(212, 168, 255, 0.4)' },
  claim: { letterSpacing: 1.4, fontStyle: 'italic' },
});
