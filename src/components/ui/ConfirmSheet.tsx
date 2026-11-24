import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  emoji?: string;
  accent?: string;
  gradient?: readonly [string, string];
  testID?: string;
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  emoji,
  accent,
  gradient,
  testID,
}: ConfirmSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      accent={destructive ? colors.danger : accent}
      testID={testID}
    >
      <View style={styles.text}>
        {emoji ? (
          <AppText variant="h1" style={styles.emoji} aria-hidden>
            {emoji}
          </AppText>
        ) : null}
        <AppText variant="h2" role="heading">
          {title}
        </AppText>
        <AppText variant="bodyLarge" color={colors.textSecondary}>
          {body}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          variant={destructive ? 'danger' : 'primary'}
          gradient={gradient}
          size="md"
        />
        <Button label={cancelLabel} onPress={onCancel} variant="ghost" size="md" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  text: { gap: spacing.sm },
  emoji: { marginBottom: spacing.xs },
  actions: { gap: spacing.xs },
});
