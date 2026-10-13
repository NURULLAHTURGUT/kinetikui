import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type SplitPaneProps = {
  /** The top pane (or the left one when horizontal). */
  first: ReactNode;
  second: ReactNode;
  /** "vertical" stacks the panes; "horizontal" puts them side by side. Defaults to "vertical". */
  direction?: 'vertical' | 'horizontal';
  /** Share of the space the first pane starts with. Defaults to 0.5. */
  initial?: number;
  /** Shares the divider settles on when let go. Defaults to [0.25, 0.5, 0.75]. */
  snapPoints?: readonly number[];
  /** No pane gets smaller than this many points. Defaults to 56. */
  minSize?: number;
  onChange?: (share: number) => void;
  /** A tick when the divider settles. Defaults to true. */
  haptics?: boolean;
  /** Names the divider for screen readers. Defaults to "Resize panes". */
  accessibilityLabel?: string;
  testID?: string;
  /** Needs a fixed height when vertical (or width when horizontal). */
  style?: StyleProp<ViewStyle>;
};

const GAP = 12;

/**
 * Two panes with a divider between them. Drag the handle and the panes trade
 * space under your finger; let go and the divider springs to the nearest
 * resting point, taking the flick into account. The handle grows while held.
 */
export function SplitPane({
  first,
  second,
  direction = 'vertical',
  initial = 0.5,
  snapPoints = [0.25, 0.5, 0.75],
  minSize = 56,
  onChange,
  haptics = true,
  accessibilityLabel = 'Resize panes',
  testID,
  style,
}: SplitPaneProps) {
  const { colors, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const vertical = direction === 'vertical';
  const [size, setSize] = useState(0);
  const [share, setShare] = useState(initial);
  const total = useSharedValue(0);
  const at = useSharedValue(initial);
  const start = useSharedValue(initial);
  const held = useSharedValue(0);
  const points = [...snapPoints].sort((a, b) => a - b);

  useEffect(() => {
    total.set(Math.max(0, size - GAP));
  }, [size, total]);

  const settle = (next: number) => {
    setShare(next);
    haptic('tick');
    onChange?.(next);
  };

  const pan = Gesture.Pan()
    .withTestId('split-pane')
    .minDistance(0)
    .onBegin(() => {
      start.set(at.get());
      held.set(withSpring(1, spring('snappy', reduced)));
    })
    .onUpdate((e) => {
      const t = total.get();
      if (t === 0) return;
      const lo = Math.min(0.5, minSize / t);
      const d = (vertical ? e.translationY : e.translationX) / t;
      at.set(Math.max(lo, Math.min(1 - lo, start.get() + d)));
    })
    .onFinalize((e) => {
      held.set(withSpring(0, spring('smooth', reduced)));
      const t = total.get();
      if (t === 0) return;
      // Where a flick would carry it, then the nearest resting point.
      const v = (vertical ? e.velocityY : e.velocityX) / t;
      const aim = at.get() + v * 0.12;
      let best = points[0] ?? 0.5;
      for (const p of points) if (Math.abs(p - aim) < Math.abs(best - aim)) best = p;
      at.set(reduced ? best : withSpring(best, spring('smooth', false, v)));
      scheduleOnRN(settle, best);
    });

  const nudge = (e: AccessibilityActionEvent) => {
    const up = e.nativeEvent.actionName === 'increment';
    const next = up
      ? points.find((p) => p > share + 0.001)
      : [...points].reverse().find((p) => p < share - 0.001);
    if (next === undefined) return;
    at.set(reduced ? next : withSpring(next, spring('smooth')));
    settle(next);
  };

  const firstStyle = useAnimatedStyle(() => {
    const s = at.get() * total.get();
    return vertical ? { height: s } : { width: s };
  });
  const handle = useAnimatedStyle(() => {
    const k = held.get();
    return vertical
      ? { width: 36 + k * 20, opacity: 0.6 + k * 0.4 }
      : { height: 36 + k * 20, opacity: 0.6 + k * 0.4 };
  });

  return (
    <View
      testID={testID}
      style={[vertical ? styles.column : styles.row, style]}
      onLayout={(e) => setSize(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.pane, firstStyle]}>{first}</Animated.View>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ text: `${Math.round(share * 100)} percent` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={nudge}
          style={vertical ? styles.dividerY : styles.dividerX}
        >
          <Animated.View
            style={[
              vertical ? styles.handleY : styles.handleX,
              { backgroundColor: colors.borderStrong, borderRadius: radius.pill },
              handle,
            ]}
          />
        </View>
      </GestureDetector>
      <View style={[styles.pane, styles.fill]}>{second}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
  pane: { overflow: 'hidden' },
  fill: { flex: 1 },
  // The divider is a full 44 pt target that overlaps the panes, but only takes GAP of space.
  dividerY: {
    height: minTouchTarget,
    marginVertical: -(minTouchTarget - GAP) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dividerX: {
    width: minTouchTarget,
    marginHorizontal: -(minTouchTarget - GAP) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  handleY: { height: 4 },
  handleX: { width: 4 },
});
