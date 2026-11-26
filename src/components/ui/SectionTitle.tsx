import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="overline" color={colors.textMuted} role="heading" aria-level={2} style={styles.title}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs },
});
