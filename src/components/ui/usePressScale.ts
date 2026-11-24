import { useCallback, useState } from 'react';
import { Animated } from 'react-native';

import { useMotion } from '@/hooks/useMotion';
import { NATIVE_DRIVER, springs } from '@/theme';

/** Subtle scale-down feedback while a control is pressed. */
export function usePressScale(pressedScale = 0.965) {
  const [scale] = useState(() => new Animated.Value(1));
  const { enabled } = useMotion();

  const animateTo = useCallback(
    (toValue: number) => {
      if (!enabled) return;
      Animated.spring(scale, { toValue, useNativeDriver: NATIVE_DRIVER, ...springs.press }).start();
    },
    [enabled, scale],
  );

  return {
    scale,
    onPressIn: () => animateTo(pressedScale),
    onPressOut: () => animateTo(1),
  };
}
