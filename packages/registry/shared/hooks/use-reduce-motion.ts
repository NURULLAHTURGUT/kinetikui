import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useKinetikConfig } from '../tokens/theme';

/**
 * True when motion should be reduced: either the OS accessibility setting is on
 * or the nearest `KinetikProvider` forces it. Unlike Reanimated's
 * `useReducedMotion`, this re-renders when the system setting changes.
 */
export function useReduceMotion(): boolean {
  const { reduceMotion } = useKinetikConfig();
  const system = useSystemReduceMotion(reduceMotion === 'system');
  if (reduceMotion === 'always') return true;
  if (reduceMotion === 'never') return false;
  return system;
}

function useSystemReduceMotion(subscribe: boolean): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!subscribe) return;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setEnabled(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [subscribe]);

  return enabled;
}
