import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Icon } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, minTouchSize, radius, spacing } from '@/theme';
import type { Player } from '@/types';

interface ConfessionPickerProps {
  players: readonly Player[];
  selectedIds: readonly string[];
  onToggle: (playerId: string) => void;
  /** Confessions so far per player id (shown as a small counter). */
  counts: Record<string, number>;
  accent: string;
}

/** "Wer hat schon?" – voluntary multi-select of the players who have done it. */
export function ConfessionPicker({
  players,
  selectedIds,
  onToggle,
  counts,
  accent,
}: ConfessionPickerProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container} testID="confession-picker">
      <View style={styles.header}>
        <AppText variant="overline" color={accent} role="heading">
          {t('nhie.whoHas')}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {t('nhie.whoHasHint')}
        </AppText>
      </View>
      <View style={styles.chips}>
        {players.map((player) => {
          const selected = selectedIds.includes(player.id);
          const count = counts[player.id] ?? 0;
          return (
            <Pressable
              key={player.id}
              role="checkbox"
              aria-checked={selected}
              aria-label={t('nhie.confessToggle', { name: player.name })}
              onPress={() => {
                feedback('select');
                onToggle(player.id);
              }}
              style={({ pressed }) => [
                styles.chip,
                selected && { borderColor: accent, backgroundColor: `${accent}2E` },
                pressed && styles.pressed,
              ]}
            >
              <Avatar name={player.name} colorIndex={player.colorIndex} size={30} />
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
                {player.name}
              </AppText>
              {count > 0 ? (
                <AppText variant="caption" color={colors.textMuted} aria-hidden>
                  {`${count}×`}
                </AppText>
              ) : null}
              {selected ? <Icon name="checkmark-circle" size={18} color={accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: { gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minTouchSize,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs + 2,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  name: { flexShrink: 1 },
  pressed: { opacity: 0.75 },
});
