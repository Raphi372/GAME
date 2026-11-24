import { useSettingsStore } from '@/store/settingsStore';

import { useSystemReducedMotion } from './useReducedMotion';

export interface MotionPreference {
  /** True when animations should play (user setting on AND system not reducing motion). */
  enabled: boolean;
  systemReduced: boolean;
}

export function useMotion(): MotionPreference {
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const systemReduced = useSystemReducedMotion();
  return { enabled: animationsEnabled && !systemReduced, systemReduced };
}
