import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useKinetikConfig } from '../tokens/theme';

/**
 * Kinetik's haptic vocabulary. Haptics are reserved for moments that carry
 * meaning — a threshold crossed, an action confirmed — and default to light.
 *
 *  - tick:    a discrete step (slider detent, odometer digit, tab change)
 *  - tap:     a light physical acknowledgement (press, toggle)
 *  - thud:    a heavier landing (card dropped, sheet snapped)
 *  - success: an action completed (hold-to-confirm, form sent)
 *  - warning: something needs attention
 *  - error:   an action failed
 */
export type HapticKind = 'tick' | 'tap' | 'thud' | 'success' | 'warning' | 'error';

export type Haptic = (kind?: HapticKind) => void;

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function play(kind: HapticKind): void {
  let pending: Promise<void>;
  switch (kind) {
    case 'tick':
      pending = Haptics.selectionAsync();
      break;
    case 'tap':
      pending = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'thud':
      pending = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      pending = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      pending = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      pending = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
  // Haptics are best-effort; a device without an actuator must not throw.
  pending.catch(() => {});
}

const noop: Haptic = () => {};

/**
 * Returns a stable function that plays a haptic, or a no-op when haptics are
 * disabled globally (provider), locally (`enabled = false`) or unsupported.
 *
 * Call it from the JS thread. Inside a worklet, use
 * `scheduleOnRN(haptic, 'tick')` from `react-native-worklets`.
 */
export function useHaptic(enabled = true): Haptic {
  const { haptics } = useKinetikConfig();
  const active = supported && haptics && enabled;
  return useMemo(() => (active ? (kind: HapticKind = 'tap') => play(kind) : noop), [active]);
}
