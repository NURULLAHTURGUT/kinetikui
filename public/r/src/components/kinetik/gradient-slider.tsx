import { useEffect, useState, type ReactNode } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

/** A colour stop as hue (0–360), saturation and lightness (0–100). */
export type HslStop = readonly [hue: number, saturation: number, lightness: number];

export const GRADIENT_PRESETS = {
  /** The colour wheel, red through violet and back to red. */
  hue: [0, 60, 120, 180, 240, 300, 360].map((h) => [h, 85, 58] as const),
  /** Cool blue through neutral to warm amber, for white balance. */
  temperature: [
    [218, 72, 62],
    [210, 30, 80],
    [44, 40, 80],
    [42, 82, 58],
  ],
} satisfies Record<string, readonly HslStop[]>;

export type GradientSliderAction = {
  icon: ReactNode;
  /** Accessible name, e.g. "Reset white balance". */
  label: string;
  onPress: () => void;
};

export type GradientSliderProps = {
  value: number;
  /** Called with the stepped value and the colour under the knob while dragging. */
  onValueChange?: (value: number, color: string) => void;
  onSlidingComplete?: (value: number, color: string) => void;
  /** Defaults to 0. */
  min?: number;
  /** Defaults to 1. */
  max?: number;
  /** Snap interval. Defaults to 1/100 of the range. */
  step?: number;
  /** A preset name or your own stops, left to right. Defaults to `hue`. */
  stops?: keyof typeof GRADIENT_PRESETS | readonly HslStop[];
  /** Accessible name. */
  label: string;
  formatValue?: (value: number) => string;
  /** Show a swatch of the picked colour at the end. Defaults to true without an `action`. */
  swatch?: boolean;
  /** A round button at the end, e.g. reset. */
  action?: GradientSliderAction;
  disabled?: boolean;
  /** A tick at both ends. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BAR = 28;
const KNOB = 22;
const INSET = (BAR - KNOB) / 2;

const css = ([h, s, l]: readonly number[]) => `hsl(${h}, ${s}%, ${l}%)`;

/** The colour at `t` (0–1) along the stops, as a CSS `hsl()` string. */
export function colorAt(stops: readonly HslStop[], t: number): string {
  if (stops.length === 0) return 'transparent';
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = stops[Math.max(0, i)]!;
  const b = stops[Math.min(stops.length - 1, i + 1)]!;
  const f = stops.length === 1 ? 0 : x - i;
  return css(a.map((v, k) => Math.round((v + (b[k]! - v) * f) * 10) / 10));
}

/**
 * A slider whose track is the colour range it picks from: the hue wheel, a
 * white-balance blend or your own stops. A ring knob shows the colour under
 * it, and a swatch at the end pops each time the colour lands.
 */
export function GradientSlider({
  value,
  onValueChange,
  onSlidingComplete,
  min = 0,
  max = 1,
  step,
  stops = 'hue',
  label,
  formatValue,
  swatch,
  action,
  disabled = false,
  haptics = true,
  style,
}: GradientSliderProps) {
  const { colors, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const list = typeof stops === 'string' ? GRADIENT_PRESETS[stops] : stops;
  const range = max - min || 1;
  const stepSize = step ?? range / 100;
  const decimals = Math.min(6, (String(stepSize).split('.')[1] ?? '').length);
  const format = formatValue ?? ((v: number) => v.toFixed(decimals));
  const showSwatch = swatch ?? !action;

  const width = useSharedValue(0);
  const progress = useSharedValue((value - min) / range);
  const held = useSharedValue(0);
  const committed = useSharedValue(value);
  const dragging = useSharedValue(false);
  const pop = useSharedValue(1);
  const [shown, setShown] = useState<number | null>(null);
  const now = shown ?? value;
  const color = colorAt(list, (now - min) / range);

  useEffect(() => {
    if (dragging.get()) return;
    const p = (Math.min(max, Math.max(min, value)) - min) / range;
    progress.set(reduced ? p : withSpring(p, spring('smooth')));
    committed.set(value);
  }, [value, min, max, range, reduced, progress, committed, dragging]);

  const at = (v: number) => colorAt(list, (v - min) / range);
  const emit = (v: number) => {
    setShown(v);
    onValueChange?.(v, at(v));
    if (v === min || v === max) haptic('tick');
  };
  const complete = (v: number) => {
    setShown(null);
    onSlidingComplete?.(v, at(v));
    if (!reduced) {
      pop.set(withSequence(withTiming(1.18, timing('quick')), withSpring(1, spring('bouncy'))));
    }
  };

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get() - BAR;
    if (w <= 0) return;
    const p = Math.max(0, Math.min(1, (x - BAR / 2) / w));
    progress.set(p);
    const stepped = Math.round((min + p * range) / stepSize) * stepSize;
    const v = Math.max(min, Math.min(max, Number(stepped.toFixed(decimals))));
    if (v !== committed.get()) {
      committed.set(v);
      scheduleOnRN(emit, v);
    }
  };

  const release = () => {
    'worklet';
    dragging.set(false);
    held.set(withSpring(0, spring('smooth', reduced)));
    progress.set(withSpring((committed.get() - min) / range, spring('snappy', reduced)));
    scheduleOnRN(complete, committed.get());
  };

  const pan = Gesture.Pan()
    .withTestId('gradient-slider')
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
    .withTestId('gradient-slider-tap')
    .enabled(!disabled)
    .onEnd((e) => {
      moveTo(e.x);
      release();
    });

  const knob = useAnimatedStyle(() => ({
    transform: [
      { translateX: INSET + progress.get() * Math.max(0, width.get() - BAR) },
      { scale: 1 + held.get() * 0.3 },
    ],
  }));
  const swatchStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const delta =
      Math.max(stepSize, range / 20) * (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    const next = Math.max(min, Math.min(max, committed.get() + delta));
    const v = Number((Math.round(next / stepSize) * stepSize).toFixed(decimals));
    committed.set(v);
    progress.set(withSpring((v - min) / range, spring('snappy', reduced)));
    onValueChange?.(v, at(v));
    onSlidingComplete?.(v, at(v));
  };

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          paddingLeft: space[3],
          paddingRight: showSwatch || action ? space[2] : space[3],
          gap: space[3],
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
          accessibilityValue={{ min, max, now, text: format(now) }}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => width.set(e.nativeEvent.layout.width)}
          style={styles.hit}
        >
          <View
            style={[
              styles.bar,
              { borderRadius: BAR / 2 },
              gradient(`linear-gradient(90deg, ${list.map(css).join(', ')})`),
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.knob,
              { borderColor: colors.highlight, backgroundColor: color, boxShadow: shadow.sm },
              knob,
            ]}
          />
        </View>
      </GestureDetector>
      {showSwatch ? (
        <Animated.View
          aria-hidden
          style={[styles.swatch, { borderColor: colors.borderStrong }, swatchStyle]}
        >
          <View style={[styles.swatchFill, { backgroundColor: color }]} />
        </Animated.View>
      ) : null}
      {action ? <ActionButton action={action} disabled={disabled} /> : null}
    </View>
  );
}

function ActionButton({ action, disabled }: { action: GradientSliderAction; disabled: boolean }) {
  const reduced = useReduceMotion();
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.12 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      disabled={disabled}
      onPress={action.onPress}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      style={styles.action}
    >
      <Animated.View style={style}>{action.icon}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  hit: { flex: 1, height: minTouchTarget, justifyContent: 'center' },
  bar: { height: BAR },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 2.5,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    padding: 3,
    margin: 7,
  },
  swatchFill: { flex: 1, borderRadius: 12 },
  action: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
