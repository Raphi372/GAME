import { Platform } from 'react-native';

interface KeyEventLike {
  key?: string;
  repeat?: boolean;
  nativeEvent?: { key?: string; repeat?: boolean };
  preventDefault?: () => void;
}

/**
 * Web only: radios, switches and checkboxes are toggled with the space bar – react-native-web
 * presses them on Enter only. Spread the result onto the Pressable.
 */
export function spaceKeyPress(onPress: () => void): object {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyDown: (event: KeyEventLike) => {
      const key = event.key ?? event.nativeEvent?.key;
      if (key !== ' ' && key !== 'Spacebar') return;
      // Keep the page from scrolling, but act once per key press – browsers repeat
      // keydown while the key is held.
      event.preventDefault?.();
      if (event.repeat ?? event.nativeEvent?.repeat) return;
      onPress();
    },
  };
}
