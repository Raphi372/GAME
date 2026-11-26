import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { feedback, type FeedbackEvent } from '@/services/feedback';
import { brandGradient, colors, glow, minTouchSize, radius, readableWithWhite, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { usePressScale } from './usePressScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  /** Screen reader hint describing the result of the action. */
  hint?: string;
  /** Custom gradient for primary buttons (e.g. level colours). */
  gradient?: readonly [string, string];
  /** Haptic/sound feedback on press. `null` disables it. */
  feedbackEvent?: FeedbackEvent | null;
  style?: StyleProp<ViewStyle>;
  /** Tighter padding and letter spacing for narrow layouts. */
  dense?: boolean;
  testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { lg: 64, md: 54, sm: minTouchSize };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  disabled = false,
  hint,
  gradient = brandGradient,
  feedbackEvent = 'tap',
  style,
  dense = false,
  testID,
}: ButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const height = HEIGHTS[size];
  // Primary buttons: pure white on the gradient, which is darkened for white text (WCAG AA).
  const textColor =
    variant === 'primary'
      ? colors.textOnAccent
      : variant === 'ghost'
      ? colors.textSecondary
      : variant === 'danger'
      ? colors.danger
      : colors.text;

  const content = (
    <View
      style={[
        styles.content,
        {
          height,
          paddingHorizontal: dense ? spacing.sm : size === 'lg' ? spacing.xl : spacing.md,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} color={textColor} /> : null}
      <AppText
        variant={size === 'lg' ? 'button' : 'buttonSmall'}
        color={textColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.label, dense && styles.labelDense]}
      >
        {label.toLocaleUpperCase()}
      </AppText>
    </View>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        disabled ? styles.disabled : null,
        variant === 'primary' && !disabled ? glow(gradient[1], 26, 0, '55') : null,
        styles.wrapper,
        style,
      ]}
    >
      <Pressable
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        accessibilityHint={hint}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          if (feedbackEvent) feedback(feedbackEvent);
          onPress();
        }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          variant === 'secondary' && styles.secondary,
          variant === 'danger' && styles.danger,
          variant === 'ghost' && styles.ghost,
          pressed && variant !== 'primary' && styles.pressed,
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            // Darkened just enough for the white label to stay readable (WCAG AA).
            colors={[readableWithWhite(gradient[0]), readableWithWhite(gradient[1])]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          >
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.pill },
  base: { borderRadius: radius.pill, overflow: 'hidden' },
  gradient: { borderRadius: radius.pill },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { flexShrink: 1 },
  labelDense: { letterSpacing: 0.3 },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.4)',
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.38 },
});
