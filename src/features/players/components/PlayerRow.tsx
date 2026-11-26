import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Avatar, IconButton } from '@/components/ui';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, fonts, radius, scaled, spacing } from '@/theme';
import type { Player } from '@/types';

import { MAX_NAME_LENGTH, type ValidationResult } from '../validation';
import { INPUT_FONT_SIZE, playerErrorMessage } from './AddPlayerForm';

interface PlayerRowProps {
  player: Player;
  onRename: (name: string) => ValidationResult;
  onRemove: () => void;
  removeDisabled?: boolean;
  removeDisabledHint?: string;
}

/** Avatar width plus gap: the error lines up with the name. */
const ERROR_INDENT = 56;

export function PlayerRow({
  player,
  onRename,
  onRemove,
  removeDisabled = false,
  removeDisabledHint,
}: PlayerRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const [error, setError] = useState<string | null>(null);
  const { scale } = useLayout();

  const startEditing = () => {
    setDraft(player.name);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    const result = onRename(draft);
    if (result.ok) {
      feedback('select');
      setEditing(false);
      setError(null);
    } else {
      feedback('warning');
      setError(playerErrorMessage(t, result.error));
    }
  };

  return (
    <View style={styles.container} testID={`player-row-${player.name}`}>
      <View style={styles.row}>
        <Avatar name={editing ? draft || player.name : player.name} colorIndex={player.colorIndex} />
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              if (error) setError(null);
            }}
            onSubmitEditing={save}
            autoFocus
            aria-label={t('players.editLabel', { name: player.name })}
            maxLength={MAX_NAME_LENGTH + 5}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            selectionColor={colors.accent}
            style={[styles.input, { fontSize: scaled(INPUT_FONT_SIZE, scale) }]}
            maxFontSizeMultiplier={1.4}
          />
        ) : (
          <AppText variant="bodyLarge" style={styles.name} numberOfLines={1}>
            {player.name}
          </AppText>
        )}
        {editing ? (
          <>
            <IconButton icon="checkmark" label={t('players.saveName')} onPress={save} tone="accent" size={44} />
            <IconButton
              icon="close"
              label={t('players.cancelEdit')}
              onPress={() => {
                setEditing(false);
                setError(null);
              }}
              size={44}
            />
          </>
        ) : (
          <>
            <IconButton
              icon="pencil"
              label={t('players.edit', { name: player.name })}
              onPress={startEditing}
              size={44}
            />
            <IconButton
              icon="trash-outline"
              label={t('players.remove', { name: player.name })}
              hint={removeDisabled ? removeDisabledHint : undefined}
              onPress={onRemove}
              disabled={removeDisabled}
              tone="danger"
              size={44}
            />
          </>
        )}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} role="alert" style={{ marginLeft: scaled(ERROR_INDENT, scale) }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, minWidth: 0 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
});
