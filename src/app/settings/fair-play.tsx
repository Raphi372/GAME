import { StyleSheet, View } from 'react-native';

import { AppText, Header, Icon, Screen, Surface, type IconName } from '@/components/ui';
import { useTranslation, type TranslationKey } from '@/i18n';
import { colors, spacing } from '@/theme';

const RULES: { icon: IconName; id: string }[] = [
  { icon: 'hand-left-outline', id: 'voluntary' },
  { icon: 'water-outline', id: 'alcohol' },
  { icon: 'shield-checkmark-outline', id: 'consent' },
  { icon: 'heart-outline', id: 'respect' },
  { icon: 'stop-circle-outline', id: 'stop' },
  { icon: 'person-outline', id: 'adults' },
];

export default function FairPlayScreen() {
  const { t } = useTranslation();
  return (
    <Screen focusableScroll header={<Header title={t('fairPlay.title')} subtitle={t('fairPlay.intro')} />}>
      <View style={styles.list}>
        {RULES.map((rule) => (
          <Surface key={rule.id} style={styles.card}>
            <View style={styles.iconBox}>
              <Icon name={rule.icon} size={22} color={colors.accent} />
            </View>
            <View style={styles.text}>
              <AppText variant="h3" role="heading">
                {t(`fairPlay.${rule.id}.title` as TranslationKey)}
              </AppText>
              <AppText variant="body" color={colors.textSecondary}>
                {t(`fairPlay.${rule.id}.body` as TranslationKey)}
              </AppText>
            </View>
          </Surface>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.md },
  card: { flexDirection: 'row', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  text: { flex: 1, gap: spacing.xs },
});
