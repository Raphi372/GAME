import { useWindowDimensions } from 'react-native';

import { getLayout, type Layout } from '@/theme';

/** Current layout class – updates when the window is resized or rotated. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return getLayout(width, height);
}
