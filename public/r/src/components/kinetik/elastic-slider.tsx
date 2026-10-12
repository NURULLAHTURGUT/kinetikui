import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type ElasticSliderProps = {
  value: number;
  /** Called as the stepped value changes while dragging. */
  onValueChange?: (value: number) => void;
  /** Called once when the finger lifts. */
  onSlidingComplete?: (value: number) => void;
  /** Defaults to 0. */
  min?: number;
  /** Defaults to 1. */
  max?: number;
  /** Snap interval. Defaults to 1/100 of the range. Detents tick when `haptics` is on. */
  step?: number;
  /** Accessible name. Shown above the track when `showLabel` is true. */
  label: string;
  /** Show the label and current value above the track. Defaults to true. */
  showLabel?: boolean;
  /** Formats the value for the label, bubble and screen readers. */
  formatValue?: (value: number) => string;
  /** Icon before the track, e.g. a quiet speaker. Nudged outward when the track is pulled past its start. */
  leading?: ReactNode;
  /** Icon after the track, e.g. a loud speaker. Nudged outward when the track is pulled past its end. */
  trailing?: ReactNode;
  /** Fill colour. Defaults to the theme ember. */
  color?: string;
  disabled?: boolean;
  /** Ticks on each step (when steps are coarse) and at the ends. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Track thickness at rest and while held. */
const TRACK = 8;
const TRACK_ACTIVE = 16;

/** Rubber-band resistance: the further past the end, the harder it pulls back. */
function rubber(distance: number, dimension: number) {
  'worklet';
  const d = Math.abs(distance);
  const resisted = (d * dimension * 0.55) / (dimension + d * 0.55);
  return Math.sign(distance) * resisted;
}

const decimalsOf = (n: number) => {
  const s = String(n);
  return s.includes('.') ? s.split('.')[1]!.length : 0;
};

/**
 * A slider in the style of the iOS media controls: a slim track that swells
 * while held and fills from the left, with no thumb to aim for. Pulling past
 * either end stretches it like rubber, nudges the icon on that side, and it
 * springs back on release.
 */
export function ElasticSlider({
  value,
  onValueChange,
  onSlidingComplete,
  min = 0,
  max = 1,
  step,
  label,
  showLabel = true,
  formatValue,
  leading,
  trailing,
  color,
  disabled = false,
  haptics = true,
  style,
}: ElasticSliderProps) {
  const { colors, font, space, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const fill = color ?? colors.ember;
  const range = max - min || 1;
  const stepSize = step ?? range / 100;
  const decimals = Math.min(6, decimalsOf(stepSize));
  // Only tick on detents that are coarse enough to feel; continuous sliders tick at the ends.
  const tickSteps = range / stepSize <= 40;
  const format = formatValue ?? ((v: number) => v.toFixed(decimals));

  const width = useSharedValue(0);
  const progress = useSharedValue((value - min) / range);
  const stretch = useSharedValue(0);
  const active = useSharedValue(0);
  const committed = useSharedValue(value);
  const dragging = useSharedValue(false);
  // Value under the finger while dragging; otherwise the controlled `value` is shown.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const bubble = dragValue ?? value;

  // Follow external value changes when the user is not dragging.
  useEffect(() => {
    if (dragging.get()) return;
    const p = (Math.min(max, Math.max(min, value)) - min) / range;
    progress.set(reduced ? p : withSpring(p, spring('smooth')));
    committed.set(value);
  }, [value, min, max, range, reduced, progress, committed, dragging]);

  const emit = (v: number, edge: boolean) => {
    setDragValue(v);
    onValueChange?.(v);
    if (edge || tickSteps) haptic('tick');
  };
  const complete = (v: number) => {
    setDragValue(null);
    onSlidingComplete?.(v);
  };

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get();
    if (w === 0) return;
    const raw = x / w;
    const clamped = Math.max(0, Math.min(1, raw));
    progress.set(clamped);
    // Past the ends, stretch with resistance instead of moving the thumb.
    const over = (raw - clamped) * w;
    stretch.set(reduced ? 0 : rubber(over, w * 0.35));
    const stepped = Math.round((min + clamped * range) / stepSize) * stepSize;
    const v = Math.max(min, Math.min(max, Number(stepped.toFixed(decimals))));
    if (v !== committed.get()) {
      committed.set(v);
      scheduleOnRN(emit, v, v === min || v === max);
    }
  };

  const release = () => {
    'worklet';
    dragging.set(false);
    active.set(withSpring(0, spring('smooth', reduced)));
    stretch.set(withSpring(0, spring('bouncy', reduced)));
    // Settle the thumb exactly on the committed step.
    progress.set(withSpring((committed.get() - min) / range, spring('snappy', reduced)));
    scheduleOnRN(complete, committed.get());
  };

  const pan = Gesture.Pan()
    .withTestId('elastic-slider')
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
      active.set(withSpring(1, spring('snappy', reduced)));
    })
    .onStart((e) => moveTo(e.x))
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => release());

  const tap = Gesture.Tap()
    .withTestId('elastic-slider-tap')
    .enabled(!disabled)
    .onEnd((e) => {
      moveTo(e.x);
      release();
    });

  const trackStyle = useAnimatedStyle(() => {
    const w = width.get();
    const st = stretch.get();
    const grow = w === 0 ? 1 : (w + Math.abs(st)) / w;
    return {
      height: TRACK + active.get() * (TRACK_ACTIVE - TRACK),
      // Stretched rubber gets longer and a little thinner.
      transform: [
        { translateX: st / 2 },
        { scaleX: grow },
        { scaleY: 1 - Math.min(0.35, (grow - 1) * 1.6) },
      ],
    };
  });
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  // The whole control leans in a touch while held.
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + active.get() * 0.02 }] }));
  const leadingStyle = useAnimatedStyle(() => {
    const st = Math.min(0, stretch.get());
    return {
      opacity: 0.6 + active.get() * 0.4,
      transform: [{ translateX: st * 0.6 }, { scale: 1 + Math.min(0.25, -st / 160) }],
    };
  });
  const trailingStyle = useAnimatedStyle(() => {
    const st = Math.max(0, stretch.get());
    return {
      opacity: 0.6 + active.get() * 0.4,
      transform: [{ translateX: st * 0.6 }, { scale: 1 + Math.min(0.25, st / 160) }],
    };
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const delta = Math.max(stepSize, range / 20);
    const next =
      e.nativeEvent.actionName === 'increment' ? committed.get() + delta : committed.get() - delta;
    const v = Number(
      (Math.round(Math.max(min, Math.min(max, next)) / stepSize) * stepSize).toFixed(decimals),
    );
    committed.set(v);
    progress.set(withSpring((v - min) / range, spring('snappy', reduced)));
    onValueChange?.(v);
    onSlidingComplete?.(v);
  };

  return (
    <View style={[{ gap: space[2], opacity: disabled ? 0.45 : 1 }, style]}>
      {showLabel && (
        <View style={styles.header}>
          <Text
            style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.sm,
              fontVariant: ['tabular-nums'],
            }}
          >
            {format(bubble)}
          </Text>
        </View>
      )}
      <Animated.View style={[styles.row, { gap: space[3] }, rowStyle]}>
        {leading ? (
          <Animated.View style={[styles.icon, leadingStyle]} pointerEvents="none">
            {leading}
          </Animated.View>
        ) : null}
        <GestureDetector gesture={Gesture.Race(pan, tap)}>
          <View
            collapsable={false}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{ min, max, now: bubble, text: format(bubble) }}
            accessibilityState={{ disabled }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAccessibilityAction}
            onLayout={(e) => width.set(e.nativeEvent.layout.width)}
            style={[styles.hit, { height: minTouchTarget }]}
          >
            <Animated.View
              style={[
                styles.track,
                { backgroundColor: colors.track, borderRadius: radius.pill },
                trackStyle,
              ]}
            >
              <Animated.View style={[styles.fill, { backgroundColor: fill }, fillStyle]} />
            </Animated.View>
          </View>
        </GestureDetector>
        {trailing ? (
          <Animated.View style={[styles.icon, trailingStyle]} pointerEvents="none">
            {trailing}
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  hit: { flex: 1, justifyContent: 'center' },
  track: { overflow: 'hidden' },
  fill: { height: '100%' },
});
