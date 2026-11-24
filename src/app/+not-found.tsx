import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <AppText variant="hero" align="center" aria-hidden>
        🌶️
      </AppText>
      <AppText variant="h2" align="center" role="heading">
        {t('notFound.title')}
      </AppText>
      <Button label={t('notFound.back')} onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', gap: spacing.xl },
});
