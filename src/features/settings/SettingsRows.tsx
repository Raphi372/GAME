import { Children, Fragment, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, Icon, Surface, type IconName } from '@/components/ui';
import { feedback } from '@/services/feedback';
import { colors, minTouchSize, palette, spacing } from '@/theme';

export function SettingsGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <Surface style={styles.group}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </Surface>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon: IconName;
}

export function SwitchRow({ label, hint, value, onValueChange, icon }: SwitchRowProps) {
  const toggle = (next: boolean) => {
    if (next) feedback('select');
    onValueChange(next);
  };
  // The whole row is the switch (large touch target, one screen reader element).
  return (
    <Pressable
      role="switch"
      aria-label={label}
      aria-checked={value}
      accessibilityHint={hint}
      onPress={() => toggle(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={colors.lilacOrText} />
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.textMuted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View aria-hidden importantForAccessibility="no-hide-descendants">
        <Switch
          value={value}
          onValueChange={toggle}
          trackColor={{ false: palette.graphite, true: palette.neonPurple }}
          thumbColor={value ? palette.white : palette.mist}
          ios_backgroundColor={palette.graphite}
          {...WEB_SWITCH_PROPS}
        />
      </View>
    </Pressable>
  );
}

interface LinkRowProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  hint?: string;
  tone?: 'default' | 'danger';
}

export function LinkRow({ label, icon, onPress, hint, tone = 'default' }: LinkRowProps) {
  const color = tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      role="button"
      aria-label={label}
      accessibilityHint={hint}
      onPress={() => {
        feedback('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={tone === 'danger' ? colors.danger : colors.lilacOrText} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={color}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={colors.textMuted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function RadioRow({ label, selected, onPress }: RadioRowProps) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onPress={() => {
        feedback('select');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

/** react-native-web uses its own prop for the active thumb colour. */
const WEB_SWITCH_PROPS: object = Platform.OS === 'web' ? { activeThumbColor: palette.white } : {};

const styles = StyleSheet.create({
  group: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  divider: { height: 1, backgroundColor: colors.border },
  row: {
    minHeight: minTouchSize + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: spacing.xxs },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
