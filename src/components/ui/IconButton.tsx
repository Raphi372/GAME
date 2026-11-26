import { Animated, Pressable, StyleSheet } from 'react-native';

import { useLayout } from '@/hooks/useLayout';
import { feedback } from '@/services/feedback';
import { colors, minTouchSize, radius, scaled } from '@/theme';

import { Icon, type IconName } from './Icon';
import { usePressScale } from './usePressScale';

interface IconButtonProps {
  icon: IconName;
  /** Accessible name – required because the button has no visible text. */
  label: string;
  onPress: () => void;
  hint?: string;
  disabled?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  size?: number;
  testID?: string;
}

export function IconButton({
  icon,
  label,
  onPress,
  hint,
  disabled = false,
  tone = 'default',
  size = minTouchSize,
  testID,
}: IconButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.9);
  const layout = useLayout();
  const box = scaled(size, layout.scale);
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.text;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.disabled]}>
      <Pressable
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        accessibilityHint={hint}
        disabled={disabled}
        hitSlop={6}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          feedback('tap');
          onPress();
        }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          { width: box, height: box },
          pressed && styles.pressed,
        ]}
      >
        <Icon name={icon} size={Math.round(size * 0.46)} color={color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  disabled: { opacity: 0.35 },
});
