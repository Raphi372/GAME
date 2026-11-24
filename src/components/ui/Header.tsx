import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Override for the back action. Defaults to router.back(). */
  onBack?: () => void;
  showBack?: boolean;
  right?: ReactNode;
}

export function Header({ title, subtitle, onBack, showBack = true, right }: HeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <IconButton icon="chevron-back" label={t('common.back')} onPress={handleBack} />
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.right}>{right}</View>
      </View>
      {title ? (
        <View style={styles.titles}>
          <AppText variant="h1" role="heading">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" color={colors.textSecondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 48, height: 48 },
  right: { flexDirection: 'row', gap: spacing.sm },
  titles: { gap: spacing.xs },
});
