import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useLayout } from '@/hooks/useLayout';
import { colors, scaled } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Decorative icon – always hidden from screen readers (the parent provides the label).
 * `size` is the phone size; wide windows scale it with the layout.
 */
export function Icon({ name, size = 22, color = colors.text }: IconProps) {
  const { scale } = useLayout();
  return (
    <Ionicons
      name={name}
      size={scaled(size, scale)}
      color={color}
      accessible={false}
      aria-hidden
      importantForAccessibility="no"
    />
  );
}
