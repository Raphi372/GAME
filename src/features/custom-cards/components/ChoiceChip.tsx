import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { feedback } from '@/services/feedback';
import { colors, minTouchSize, radius, spacing } from '@/theme';

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Colour of the selected state (e.g. the level colour). */
  accent?: string;
  /** Accessible name, if it differs from the visible label. */
  a11yLabel?: string;
  testID?: string;
}

/** A pill that behaves like a radio button (one choice out of a row). */
export function ChoiceChip({ label, selected, onPress, accent = colors.primary, a11yLabel, testID }: ChoiceChipProps) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={a11yLabel ?? label}
      testID={testID}
      onPress={() => {
        feedback('select');
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && { borderColor: accent, backgroundColor: `${accent}29` },
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
});
