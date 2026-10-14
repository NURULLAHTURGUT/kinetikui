import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type StepSliderAction = {
  icon: ReactNode;
  /** Accessible name, e.g. "Generate again". */
  label: string;
  onPress: () => void;
  /** Turn the icon a full circle on each press, for refresh-style actions. Defaults to true. */
  spin?: boolean;
};

export type StepSliderProps = {
  /** The selected step, from 0. */
  value: number;
  onValueChange: (value: number) => void;
  /** Number of stops. Defaults to 4. */
  steps?: number;
  /** Names for the stops, read by screen readers, e.g. ["Low", "Medium", "High", "Max"]. */
  labels?: readonly string[];
  /** Accessible name. */
  label: string;
  /** A round button at the end, e.g. regenerate. */
  action?: StepSliderAction;
  disabled?: boolean;
  /** A tick on every stop. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const THUMB = 22;

/**
 * A slider with a few fixed stops marked as dots. The knob follows the finger
 * and snaps to the nearest stop with a small overshoot; dots it has passed
 * fade back, and the optional button at the end spins when pressed.
 */
export function StepSlider({
  value,
  onValueChange,
  steps = 4,
  labels,
  label,
  action,
  disabled = false,
  haptics = true,
  style,
}: StepSliderProps) {
  const { colors, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const last = Math.max(1, steps - 1);

  const width = useSharedValue(0);
  const pos = useSharedValue(value);
  const held = useSharedValue(0);
  const committed = useSharedValue(value);
  const dragging = useSharedValue(false);

  useEffect(() => {
    if (dragging.get()) return;
    pos.set(reduced ? value : withSpring(value, spring('bouncy')));
    committed.set(value);
  }, [value, reduced, pos, committed, dragging]);

  const emit = (v: number) => {
    onValueChange(v);
    haptic('tick');
  };

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get() - THUMB;
    if (w <= 0) return;
    const p = Math.max(0, Math.min(1, (x - THUMB / 2) / w)) * last;
    pos.set(p);
    const v = Math.round(p);
    if (v !== committed.get()) {
      committed.set(v);
      scheduleOnRN(emit, v);
    }
  };

  const release = () => {
    'worklet';
    dragging.set(false);
    held.set(withSpring(0, spring('smooth', reduced)));
    pos.set(withSpring(committed.get(), spring('bouncy', reduced)));
  };

  const pan = Gesture.Pan()
    .withTestId('step-slider')
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
      held.set(withSpring(1, spring('snappy', reduced)));
    })
    .onStart((e) => moveTo(e.x))
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => release());

  const tap = Gesture.Tap()
    .withTestId('step-slider-tap')
    .enabled(!disabled)
    .onEnd((e) => {
      moveTo(e.x);
      release();
    });

  const thumb = useAnimatedStyle(() => ({
    transform: [
      { translateX: (pos.get() / last) * Math.max(0, width.get() - THUMB) },
      { scale: 1 + held.get() * 0.2 },
    ],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const next = committed.get() + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    const v = Math.max(0, Math.min(last, next));
    if (v === committed.get()) return;
    committed.set(v);
    pos.set(withSpring(v, spring('bouncy', reduced)));
    onValueChange(v);
  };

  const text = labels?.[value] ?? `Step ${value + 1} of ${steps}`;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          paddingLeft: space[3],
          paddingRight: action ? space[1] : space[3],
          gap: space[2],
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: last, now: value, text }}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => width.set(e.nativeEvent.layout.width)}
          style={styles.hit}
        >
          <View style={[styles.line, { backgroundColor: colors.track }]} />
          <View style={styles.dots} pointerEvents="none">
            {Array.from({ length: steps }, (_, i) => (
              <Dot key={i} index={i} pos={pos} />
            ))}
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              { backgroundColor: colors.highlight, boxShadow: shadow.md },
              thumb,
            ]}
          />
        </View>
      </GestureDetector>
      {action ? <SpinButton action={action} disabled={disabled} /> : null}
    </View>
  );
}

/** A stop marker that grows as the knob comes near and dims once it is behind it. */
function Dot({ index, pos }: { index: number; pos: SharedValue<number> }) {
  const { colors } = useKinetikTheme();
  const style = useAnimatedStyle(() => {
    const d = pos.get() - index;
    return {
      opacity: d > 0.5 ? 0.45 : 1,
      transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1.6, 1], 'clamp') }],
    };
  });
  return (
    <View style={styles.dotSlot}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.text }, style]} />
    </View>
  );
}

function SpinButton({ action, disabled }: { action: StepSliderAction; disabled: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const turn = useSharedValue(0);
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * 360}deg` }, { scale: 1 - press.get() * 0.12 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      disabled={disabled}
      onPress={() => {
        if (action.spin !== false && !reduced) {
          turn.set(withTiming(Math.round(turn.get()) + 1, { ...timing('slow'), duration: 600 }));
        }
        action.onPress();
      }}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? withAlpha(colors.text, 0.06) : 'transparent' },
      ]}
    >
      <Animated.View style={style}>{action.icon}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  hit: { flex: 1, height: minTouchTarget, justifyContent: 'center' },
  line: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: 2, borderRadius: 1 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotSlot: { width: THUMB, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  thumb: { position: 'absolute', left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
  action: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
