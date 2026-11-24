import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Logo, Screen, Surface, type IconName } from '@/components/ui';
import { useTranslation, type TranslationKey } from '@/i18n';
import { feedback } from '@/services/feedback';
import { useSettingsStore } from '@/store';
import { colors, spacing } from '@/theme';

const RULES: { icon: IconName; key: TranslationKey }[] = [
  { icon: 'hand-left-outline', key: 'ageGate.rule.pass' },
  { icon: 'water-outline', key: 'ageGate.rule.alcohol' },
  { icon: 'heart-outline', key: 'ageGate.rule.respect' },
];

export default function AgeGateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const confirmAge = useSettingsStore((state) => state.confirmAge);
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <AppText variant="hero" align="center" aria-hidden>
          🔒
        </AppText>
        <AppText variant="h1" align="center" role="heading">
          {t('ageGate.declinedTitle')}
        </AppText>
        <AppText variant="bodyLarge" align="center" color={colors.textSecondary}>
          {t('ageGate.declinedBody')}
        </AppText>
        <Button
          label={t('ageGate.declinedBack')}
          variant="secondary"
          size="md"
          onPress={() => setDeclined(false)}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('ageGate.confirm')}
            icon="flame"
            feedbackEvent="level"
            onPress={() => confirmAge()}
            testID="age-confirm"
          />
          <Button
            label={t('ageGate.decline')}
            variant="ghost"
            size="md"
            onPress={() => {
              feedback('warning');
              setDeclined(true);
            }}
          />
        </>
      }
    >
      <View style={styles.hero}>
        <Logo size="md" />
      </View>
      <View style={styles.text}>
        <AppText variant="overline" color={colors.accent}>
          {t('ageGate.overline')}
        </AppText>
        <AppText variant="h1" role="heading">
          {t('ageGate.title')}
        </AppText>
        <AppText variant="bodyLarge" color={colors.textSecondary}>
          {t('ageGate.body')}
        </AppText>
      </View>
      <Surface style={styles.rules}>
        {RULES.map((rule) => (
          <View key={rule.key} style={styles.rule}>
            <Icon name={rule.icon} size={20} color={colors.lilacOrText} />
            <AppText variant="bodyStrong" style={styles.ruleText}>
              {t(rule.key)}
            </AppText>
          </View>
        ))}
      </Surface>
      <View style={styles.note}>
        <AppText variant="caption" color={colors.textMuted} align="center">
          {t('ageGate.storageNote')}
        </AppText>
        <Button
          label={t('ageGate.privacyLink')}
          variant="ghost"
          size="sm"
          icon="shield-checkmark-outline"
          onPress={() => router.push('/settings/privacy')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', gap: spacing.lg },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xxxl },
  text: { gap: spacing.sm },
  rules: { marginTop: spacing.xxl, gap: spacing.lg },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleText: { flex: 1 },
  note: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.xs },
});
