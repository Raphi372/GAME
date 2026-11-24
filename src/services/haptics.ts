import * as Haptics from 'expo-haptics';

export type HapticKind = 'tap' | 'select' | 'reveal' | 'success' | 'warning';

/** Fires haptic feedback. Never throws – unsupported devices are silently ignored. */
export async function playHaptic(kind: HapticKind): Promise<void> {
  try {
    switch (kind) {
      case 'tap':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'select':
        await Haptics.selectionAsync();
        break;
      case 'reveal':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // Haptics are a nice-to-have.
  }
}
