import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, ConfirmSheet, Header, Screen, SectionTitle, Sheet, Surface } from '@/components/ui';
import { helpPageUrl, SUPPORT } from '@/config/support';
import { describeHiddenCards } from '@/features/hidden-cards/describe';
import { hasContentInLocale } from '@/features/question-decks';
import { LinkRow, RadioRow, SettingsGroup, SwitchRow } from '@/features/settings/SettingsRows';
import { feedbackMailUrl, systemLabel } from '@/features/support/feedbackMail';
import { useMotion } from '@/hooks/useMotion';
import { useTranslation } from '@/i18n';
import { clearPersistedData } from '@/services/storage';
import { useCustomCardsStore, useGameStore, useHiddenCardsStore, useSettingsStore } from '@/store';
import { colors, spacing } from '@/theme';
import { LOCALES } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, intlLocale } = useTranslation();
  const { systemReduced } = useMotion();
  const settings = useSettingsStore();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const hiddenIds = useHiddenCardsStore((state) => state.ids);
  const customCards = useCustomCardsStore((state) => state.cards);
  const hiddenCount = describeHiddenCards(hiddenIds, locale, customCards, '').length;
  /**
   * Shown when no browser or mail app answers: the address to copy instead. The text stays
   * while the sheet closes, so it does not empty out during the fade.
   */
  const [fallback, setFallback] = useState({ title: '', body: '', address: '' });
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const showFallback = (content: typeof fallback) => {
    setFallback(content);
    setFallbackOpen(true);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const confirmedOn =
    settings.ageConfirmedAt !== null
      ? new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(settings.ageConfirmedAt)
      : null;

  const openHelp = (websiteUrl: string) => {
    const url = helpPageUrl(websiteUrl, locale);
    Linking.openURL(url).catch(() =>
      showFallback({ title: t('help.unavailableTitle'), body: t('help.unavailableBody'), address: url }),
    );
  };

  const sendFeedback = (email: string) => {
    const release = (Platform.constants as { Release?: string } | undefined)?.Release;
    const body = t('feedback.body', {
      version,
      system: systemLabel(Platform.OS, Platform.Version, release),
      language: t(`settings.language.${locale}`),
    });
    Linking.openURL(feedbackMailUrl(email, t('feedback.subject'), body)).catch(() =>
      showFallback({ title: t('feedback.unavailableTitle'), body: t('feedback.unavailableBody'), address: email }),
    );
  };

  const deleteAll = () => {
    setDeleteOpen(false);
    useGameStore.getState().resetAll();
    useCustomCardsStore.getState().resetCustomCards();
    useHiddenCardsStore.getState().showAllCards();
    useSettingsStore.getState().resetSettings();
    // Last: AsyncStorage runs writes and removals in the order they were started, so the
    // resets above cannot write a key back after it was removed.
    void clearPersistedData();
  };

  return (
    <Screen header={<Header title={t('settings.title')} />}>
      <SectionTitle>{t('settings.section.experience')}</SectionTitle>
      <SettingsGroup>
        <SwitchRow
          icon="musical-notes-outline"
          label={t('settings.sound')}
          hint={t('settings.soundHint')}
          value={settings.soundEnabled}
          onValueChange={settings.setSoundEnabled}
        />
        <SwitchRow
          icon="phone-portrait-outline"
          label={t('settings.haptics')}
          hint={t('settings.hapticsHint')}
          value={settings.hapticsEnabled}
          onValueChange={settings.setHapticsEnabled}
        />
        <SwitchRow
          icon="sparkles-outline"
          label={t('settings.animations')}
          hint={systemReduced ? t('settings.reduceMotionActive') : t('settings.animationsHint')}
          value={settings.animationsEnabled}
          onValueChange={settings.setAnimationsEnabled}
        />
      </SettingsGroup>

      <SectionTitle>{t('settings.section.language')}</SectionTitle>
      <SettingsGroup>
        {LOCALES.map((code) => (
          <RadioRow
            key={code}
            label={t(`settings.language.${code}`)}
            selected={locale === code}
            onPress={() => settings.setLocale(code)}
          />
        ))}
      </SettingsGroup>
      {!hasContentInLocale(locale) ? (
        <AppText variant="caption" color={colors.textMuted} style={styles.note}>
          {t('settings.contentLanguageNote')}
        </AppText>
      ) : null}

      <SectionTitle>{t('settings.section.info')}</SectionTitle>
      <SettingsGroup>
        <LinkRow icon="help-circle-outline" label={t('settings.intro')} onPress={() => router.push('/intro?replay=1')} />
        <LinkRow icon="heart-outline" label={t('settings.fairPlay')} onPress={() => router.push('/settings/fair-play')} />
        <LinkRow icon="shield-checkmark-outline" label={t('settings.privacy')} onPress={() => router.push('/settings/privacy')} />
        <LinkRow icon="information-circle-outline" label={t('settings.about')} onPress={() => router.push('/settings/about')} />
        {/* Each row only once its address is filled in: website or contact e-mail (src/config/support.ts). */}
        {SUPPORT.websiteUrl ? (
          <LinkRow
            icon="help-buoy-outline"
            label={t('settings.help')}
            hint={t('settings.helpHint')}
            external
            onPress={() => openHelp(SUPPORT.websiteUrl!)}
          />
        ) : null}
        {SUPPORT.email ? (
          <LinkRow
            icon="mail-outline"
            label={t('settings.feedback')}
            hint={t('settings.feedbackHint')}
            external
            onPress={() => sendFeedback(SUPPORT.email!)}
          />
        ) : null}
      </SettingsGroup>

      <SectionTitle>{t('settings.section.age')}</SectionTitle>
      <Surface style={styles.ageBox}>
        <AppText variant="bodyStrong">
          {confirmedOn ? `✅ ${t('settings.ageConfirmedOn', { date: confirmedOn })}` : t('settings.ageNotConfirmed')}
        </AppText>
        <Button
          label={t('settings.ageRevoke')}
          variant="secondary"
          size="sm"
          onPress={() => setRevokeOpen(true)}
        />
      </Surface>

      <SectionTitle>{t('settings.section.data')}</SectionTitle>
      <SettingsGroup>
        <LinkRow
          icon="eye-off-outline"
          label={t('hidden.title')}
          hint={hiddenCount > 0 ? t('hidden.count', { count: hiddenCount }) : t('hidden.none')}
          onPress={() => router.push('/settings/hidden-cards')}
        />
        <LinkRow
          icon="trash-outline"
          tone="danger"
          label={t('settings.deleteData')}
          hint={t('settings.deleteDataHint')}
          onPress={() => setDeleteOpen(true)}
        />
      </SettingsGroup>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} align="center">
          {`SPICY NIGHT · ${t('settings.version', { version })}`}
        </AppText>
      </View>

      <ConfirmSheet
        visible={revokeOpen}
        title={t('settings.ageRevokeTitle')}
        body={t('settings.ageRevokeBody')}
        confirmLabel={t('settings.ageRevokeConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setRevokeOpen(false);
          settings.revokeAgeConfirmation();
        }}
        onCancel={() => setRevokeOpen(false)}
      />
      <ConfirmSheet
        visible={deleteOpen}
        emoji="🧹"
        title={t('settings.deleteDataTitle')}
        body={t('settings.deleteDataBody')}
        confirmLabel={t('settings.deleteDataConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={deleteAll}
        onCancel={() => setDeleteOpen(false)}
      />
      <Sheet
        visible={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        label={fallback.title}
        testID="contact-fallback"
      >
        <View style={styles.fallback}>
          <AppText variant="h2" role="heading">
            {fallback.title}
          </AppText>
          <AppText color={colors.textSecondary}>{fallback.body}</AppText>
          <AppText variant="bodyLarge" selectable>
            {fallback.address}
          </AppText>
        </View>
        <Button label={t('common.ok')} variant="ghost" size="md" onPress={() => setFallbackOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.sm, marginLeft: spacing.xs },
  fallback: { gap: spacing.sm },
  ageBox: { gap: spacing.md, alignItems: 'flex-start' },
  footer: { marginTop: spacing.xxxl },
});
