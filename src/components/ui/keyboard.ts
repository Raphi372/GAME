import { Platform } from 'react-native';

interface KeyEventLike {
  key?: string;
  nativeEvent?: { key?: string };
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
      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault?.();
        onPress();
      }
    },
  };
}
