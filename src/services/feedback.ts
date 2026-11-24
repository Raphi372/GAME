import { useSettingsStore } from '@/store/settingsStore';

import { playHaptic, type HapticKind } from './haptics';
import { playSound, type SoundKind } from './sound';

export type FeedbackEvent = 'tap' | 'select' | 'reveal' | 'pass' | 'level' | 'success' | 'warning';

const MAP: Record<FeedbackEvent, { haptic?: HapticKind; sound?: SoundKind }> = {
  tap: { haptic: 'tap' },
  select: { haptic: 'select', sound: 'tap' },
  reveal: { haptic: 'reveal', sound: 'reveal' },
  pass: { haptic: 'tap', sound: 'pass' },
  level: { haptic: 'success', sound: 'level' },
  success: { haptic: 'success' },
  warning: { haptic: 'warning' },
};

/** Plays haptics and/or sound for a UI event, honouring the user's settings. */
export function feedback(event: FeedbackEvent): void {
  const { hapticsEnabled, soundEnabled } = useSettingsStore.getState();
  const { haptic, sound } = MAP[event];
  if (haptic && hapticsEnabled) void playHaptic(haptic);
  if (sound && soundEnabled) void playSound(sound);
}
