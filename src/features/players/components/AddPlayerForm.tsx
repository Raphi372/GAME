import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation, type TranslateFn } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, fonts, radius, scaled, spacing } from '@/theme';

import { MAX_NAME_LENGTH, type PlayerNameError, type ValidationResult } from '../validation';
import { MAX_PLAYERS } from '@/features/game-modes/registry';

export function playerErrorMessage(t: TranslateFn, error: PlayerNameError): string {
  switch (error) {
    case 'empty':
      return t('players.error.empty');
    case 'tooLong':
      return t('players.error.tooLong', { max: MAX_NAME_LENGTH });
    case 'duplicate':
      return t('players.error.duplicate');
    case 'limitReached':
      return t('players.error.limitReached', { max: MAX_PLAYERS });
  }
}

interface AddPlayerFormProps {
  onAdd: (name: string) => ValidationResult;
  disabled?: boolean;
}

export const INPUT_FONT_SIZE = 17;

export function AddPlayerForm({ onAdd, disabled = false }: AddPlayerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const { scale } = useLayout();

  const submit = () => {
    const result = onAdd(name);
    if (result.ok) {
      feedback('select');
      setName('');
      setError(null);
    } else {
      feedback('warning');
      setError(playerErrorMessage(t, result.error));
    }
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, focused && styles.rowFocused, error ? styles.rowError : null]}>
        <TextInput
          ref={inputRef}
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('players.inputPlaceholder')}
          placeholderTextColor={colors.textMuted}
          aria-label={t('players.inputLabel')}
          maxLength={MAX_NAME_LENGTH + 5}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          submitBehavior="submit"
          editable={!disabled}
          selectionColor={colors.accent}
          style={[styles.input, { fontSize: scaled(INPUT_FONT_SIZE, scale) }]}
          maxFontSizeMultiplier={1.4}
        />
        <IconButton
          icon="add"
          label={t('players.add')}
          onPress={submit}
          tone="accent"
          disabled={disabled}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} role="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  rowFocused: { borderColor: colors.accent },
  rowError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  error: { marginLeft: spacing.lg },
});
