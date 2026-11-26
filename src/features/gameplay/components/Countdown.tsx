import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useLayout } from '@/hooks/useLayout';
import { useMotion } from '@/hooks/useMotion';
import { feedback } from '@/services/feedback';
import { durations, fonts, NATIVE_DRIVER, scaled, spacing } from '@/theme';

/** Time per step of the countdown in ms. */
export const COUNTDOWN_STEP_MS = 800;
const STEPS = 3;

interface CountdownProps {
  label: string;
  hint: string;
  goLabel: string;
  accent: string;
  /** Changing the key cancels a running countdown (e.g. new card). */
  resetKey: string;
}

/** "3 · 2 · 1 – zeigen": helps everybody point at the same time. */
/** Fixed height, so the screen does not jump between the numbers and "Los!". */
const DISPLAY_HEIGHT = 48;

export function Countdown({ label, hint, goLabel, accent, resetKey }: CountdownProps) {
  const [state, setState] = useState<{ key: string; value: number | null }>({ key: '', value: null });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { enabled: motion } = useMotion();
  const layout = useLayout();
  const [scale] = useState(() => new Animated.Value(1));
  const value = state.key === resetKey ? state.value : null;

  // Stop a running countdown when the card changes or the component unmounts.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    },
    [resetKey],
  );

  useEffect(() => {
    if (value === null || !motion) return;
    scale.setValue(1.6);
    Animated.timing(scale, {
      toValue: 1,
      duration: durations.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [value, motion, scale]);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    const key = resetKey;
    let remaining = STEPS;
    setState({ key, value: remaining });
    feedback('tap');
    timer.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        feedback('tap');
        setState({ key, value: remaining });
        return;
      }
      if (remaining === 0) {
        feedback('reveal');
        setState({ key, value: 0 });
        return;
      }
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setState({ key, value: null });
    }, COUNTDOWN_STEP_MS);
  };

  if (value === null) {
    return (
      <Button
        label={label}
        icon="timer-outline"
        variant="secondary"
        size="sm"
        hint={hint}
        feedbackEvent={null}
        onPress={start}
        testID="countdown-start"
      />
    );
  }

  return (
    <View
      style={[styles.display, { height: scaled(DISPLAY_HEIGHT, layout.scale) }]}
      aria-live="assertive"
      testID="countdown-display"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <AppText style={[styles.number, { color: accent }]} maxFontSizeMultiplier={1.2}>
          {value > 0 ? String(value) : goLabel}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xs },
  number: { fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 44 },
});
