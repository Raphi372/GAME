import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, Header, Icon, Screen, Surface, type IconName } from '@/components/ui';
import type { PremiumFeature } from '@/features/premium/entitlements';
import { formatPrice, PREMIUM_PLANS } from '@/features/premium/plans';
import { listPlayableModeIds } from '@/features/game-modes/registry';
import { countBuiltInCards } from '@/features/question-decks';
import { useTranslation } from '@/i18n';
import { brandGradient, colors, radius, spacing } from '@/theme';

const FEATURE_ICONS: Record<PremiumFeature, IconName> = {
  extraPacks: 'albums-outline',
  exclusiveCategories: 'sparkles-outline',
  customQuestions: 'create-outline',
  customRounds: 'options-outline',
  adFree: 'ban-outline',
};

export default function PremiumScreen() {
  const { t, intlLocale } = useTranslation();
  const playableModes = listPlayableModeIds();
  const total = countBuiltInCards(playableModes);

  return (
    <Screen focusableScroll header={<Header />}>
      <View style={styles.hero}>
        <LinearGradient colors={[brandGradient[0], brandGradient[1]]} style={styles.badge}>
          <Icon name="diamond" size={30} color={colors.textOnAccent} />
        </LinearGradient>
        <Chip label={t('premium.overline')} color={colors.accent} style={styles.center} />
        <AppText variant="h1" align="center" role="heading">
          {t('premium.headline')}
        </AppText>
        <AppText variant="bodyLarge" align="center" color={colors.textSecondary}>
          {t('premium.body', { count: total })}
        </AppText>
      </View>

      <Surface style={styles.group}>
        <AppText variant="overline" color={colors.textMuted}>
          {t('premium.featuresTitle')}
        </AppText>
        {(Object.keys(FEATURE_ICONS) as PremiumFeature[]).map((feature) => (
          <View key={feature} style={styles.feature}>
            <Icon name={FEATURE_ICONS[feature]} size={20} color={colors.lilacOrText} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {t(`premium.feature.${feature}`)}
            </AppText>
          </View>
        ))}
      </Surface>

      <AppText variant="overline" color={colors.textMuted} style={styles.plansTitle}>
        {t('premium.plansTitle')}
      </AppText>
      <View style={styles.plans}>
        {PREMIUM_PLANS.map((plan) => (
          <View key={plan.id} style={styles.plan} accessible>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(`premium.plan.${plan.id}`)}
            </AppText>
            <AppText variant="h3">{formatPrice(plan, intlLocale)}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t(`premium.period.${plan.period}`)}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color={colors.warning} align="center" style={styles.notice}>
        {t('premium.notAvailable')}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} align="center">
        {t('premium.freeForever')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 32px 0px rgba(255, 61, 154, 0.5)',
  },
  center: { alignSelf: 'center' },
  group: { gap: spacing.md, marginTop: spacing.lg },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  plansTitle: { marginTop: spacing.xxl, marginBottom: spacing.sm, marginLeft: spacing.xs },
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  notice: { marginTop: spacing.lg, marginBottom: spacing.xs },
});
