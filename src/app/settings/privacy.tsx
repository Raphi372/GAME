import { StyleSheet, View } from 'react-native';

import { AppText, Header, Screen, Surface } from '@/components/ui';
import { LEGAL } from '@/config/legal';
import { useTranslation, type TranslationKey } from '@/i18n';
import { colors, spacing } from '@/theme';

/** Date of the last content change of the privacy notice. */
export const PRIVACY_LAST_UPDATED = new Date(Date.UTC(2026, 10, 24));

const SECTIONS = ['summary', 'data', 'sharing', 'permissions', 'rights', 'contact'] as const;

export default function PrivacyScreen() {
  const { t, intlLocale } = useTranslation();
  const updated = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long' }).format(PRIVACY_LAST_UPDATED);
  /** Until the provider details are filled in, the notice is clearly marked as a draft. */
  const contact = LEGAL.providerContact?.trim() || null;
  return (
    <Screen focusableScroll header={<Header title={t('privacy.title')} />}>
      {contact ? null : (
        <Surface style={styles.draft} testID="privacy-draft-note">
          <AppText variant="caption" color={colors.warning}>
            {`⚠️ ${t('privacy.draftNote')}`}
          </AppText>
        </Surface>
      )}
      <View style={styles.list}>
        {SECTIONS.map((section) => (
          <View key={section} style={styles.section}>
            <AppText variant="h3" role="heading">
              {t(`privacy.${section}.title` as TranslationKey)}
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {section === 'contact' && contact ? contact : t(`privacy.${section}.body` as TranslationKey)}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color={colors.textMuted} style={styles.updated}>
        {t('privacy.updated', { date: updated })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  draft: { borderColor: 'rgba(255, 200, 97, 0.35)', marginTop: spacing.md },
  list: { gap: spacing.xl, marginTop: spacing.xl },
  section: { gap: spacing.xs },
  updated: { marginTop: spacing.xxl },
});
