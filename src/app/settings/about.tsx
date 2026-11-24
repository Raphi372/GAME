import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { AppText, Header, Icon, Logo, Screen, Surface } from '@/components/ui';
import { listPlayableModeIds } from '@/features/game-modes/registry';
import { countBuiltInCards } from '@/features/question-decks';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const playableModes = listPlayableModeIds();
  const total = countBuiltInCards(playableModes);
  const features = [
    t('about.feature.questions', { count: total, modes: playableModes.length }),
    t('about.feature.offline'),
    t('about.feature.noAccount'),
    t('about.feature.fair'),
  ];

  return (
    <Screen header={<Header />}>
      <View style={styles.hero}>
        <Logo size="md" />
      </View>
      <AppText variant="h2" role="heading">
        {t('about.title')}
      </AppText>
      <AppText variant="bodyLarge" color={colors.textSecondary} style={styles.body}>
        {t('about.body')}
      </AppText>
      <Surface style={styles.features}>
        <AppText variant="overline" color={colors.textMuted}>
          {t('about.featuresTitle')}
        </AppText>
        {features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Icon name="checkmark-circle" size={20} color={colors.accent} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {feature}
            </AppText>
          </View>
        ))}
      </Surface>
      <AppText variant="caption" color={colors.textMuted} style={styles.small}>
        {t('about.credits')}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.small}>
        {t('about.disclaimer')}
      </AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.small}>
        {t('settings.version', { version })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  body: { marginTop: spacing.sm },
  features: { marginTop: spacing.xl, gap: spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  small: { marginTop: spacing.lg },
});
