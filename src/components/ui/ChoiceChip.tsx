import { Pressable, StyleSheet } from 'react-native';

import { feedback } from '@/services/feedback';
import { colors, minTouchSize, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { spaceKeyPress } from './keyboard';

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Colour of the selected state (e.g. the level colour). */
  accent?: string;
  /** Accessible name, if it differs from the visible label. */
  a11yLabel?: string;
  /** `checkbox` for rows where several chips can be on at once. */
  kind?: 'radio' | 'checkbox';
  disabled?: boolean;
  testID?: string;
}

/** A pill that behaves like a radio button (one choice out of a row) or a checkbox. */
export function ChoiceChip({
  label,
  selected,
  onPress,
  accent = colors.primary,
  a11yLabel,
  kind = 'radio',
  disabled = false,
  testID,
}: ChoiceChipProps) {
  const choose = () => {
    if (disabled) return;
    feedback('select');
    onPress();
  };
  return (
    <Pressable
      role={kind}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      aria-label={a11yLabel ?? label}
      testID={testID}
      onPress={choose}
      {...spaceKeyPress(choose)}
      style={({ pressed }) => [
        styles.chip,
        selected && { borderColor: accent, backgroundColor: `${accent}29` },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="caption" color={selected ? colors.text : colors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouchSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
