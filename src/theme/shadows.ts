import type { ViewStyle } from 'react-native';

/**
 * Glow effects use the cross-platform `boxShadow` style
 * (supported by the React Native New Architecture on iOS, Android and web).
 */
export function glow(color: string, blur = 24, spread = 0, opacityHex = '66'): ViewStyle {
  return { boxShadow: `0px 0px ${blur}px ${spread}px ${color}${opacityHex}` };
}

export const elevation = {
  card: { boxShadow: '0px 18px 40px 0px rgba(0, 0, 0, 0.55)' } satisfies ViewStyle,
  raised: { boxShadow: '0px 8px 22px 0px rgba(0, 0, 0, 0.45)' } satisfies ViewStyle,
};
