import { useEffect, useState } from 'react';
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

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type RangeValue = readonly [number, number];

export type RangeSliderProps = {
  value: RangeValue;
  /** Called as either end changes while dragging. */
  onValueChange?: (value: [number, number]) => void;
  /** Called once when the finger lifts. */
  onSlidingComplete?: (value: [number, number]) => void;
  /** Defaults to 0. */
  min?: number;
  /** Defaults to 100. */
  max?: number;
  /** Defaults to 1. */
  step?: number;
  /** The closest the two ends may come, in value units. Defaults to one step. */
  minDistance?: number;
  /** Names the slider, e.g. "Price per night". Shown above the track. */
  label: string;
  /** Names the two ends for screen readers. Defaults to Minimum and Maximum. */
  endLabels?: readonly [string, string];
  /** Formats values for the readout, the bubble and screen readers. */
  formatValue?: (value: number) => string;
  /** Bars drawn behind the track, e.g. how many results fall in each price band. */
  histogram?: readonly number[];
  /** Haptic ticks on each step when steps are coarse. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const THUMB = 26;
const TRACK = 4;
const HISTOGRAM_H = 48;

/**
 * A slider with two ends for picking a range. The nearer end follows the
 * finger and swells while held, a bubble carries its value above it, and an
 * optional histogram behind the track lights up the bars inside the range.
 */
export function RangeSlider({
  value,
  onValueChange,
  onSlidingComplete,
  min = 0,
  max = 100,
  step = 1,
  minDistance,
  label,
  endLabels = ['Minimum', 'Maximum'],
  formatValue = (v) => String(v),
  histogram,
  haptics = true,
  disabled = false,
  testID,
  style,
}: RangeSliderProps) {
  const { colors, font, space, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const range = max - min || 1;
  const gap = minDistance ?? step;
  const tickSteps = range / step <= 40;

  const width = useSharedValue(0);
  const lo = useSharedValue((value[0] - min) / range);
  const hi = useSharedValue((value[1] - min) / range);
  const active = useSharedValue(-1);
  const held = useSharedValue(0);
  const committed = useSharedValue<[number, number]>([value[0], value[1]]);
  const [live, setLive] = useState<[number, number] | null>(null);
  const [activeEnd, setActiveEnd] = useState(-1);
  const shown = live ?? value;

  useEffect(() => {
    if (active.get() !== -1) return;
    committed.set([value[0], value[1]]);
    const a = (value[0] - min) / range;
    const b = (value[1] - min) / range;
    lo.set(reduced ? a : withSpring(a, spring('smooth')));
    hi.set(reduced ? b : withSpring(b, spring('smooth')));
  }, [value, min, range, reduced, lo, hi, active, committed]);

  const emit = (next: [number, number]) => {
    setLive(next);
    onValueChange?.(next);
    if (tickSteps) haptic('tick');
  };
  const finish = (next: [number, number]) => {
    setLive(null);
    setActiveEnd(-1);
    onSlidingComplete?.(next);
  };

  const snap = (p: number) => {
    'worklet';
    const v = Math.round((min + p * range) / step) * step;
    return Number(Math.max(min, Math.min(max, v)).toFixed(6));
  };

  const moveTo = (x: number) => {
    'worklet';
    const w = width.get();
    if (w === 0 || active.get() < 0) return;
    const p = Math.max(0, Math.min(1, (x - THUMB / 2) / w));
    const [a, b] = committed.get();
    const end = active.get();
    // Each end stops short of the other by the minimum distance.
    const v = end === 0 ? Math.min(snap(p), b - gap) : Math.max(snap(p), a + gap);
    // The thumb stops where the value stops: at the other end, less the minimum distance.
    if (end === 0) lo.set(Math.max(0, Math.min(p, (b - gap - min) / range)));
    else hi.set(Math.min(1, Math.max(p, (a + gap - min) / range)));
    const next: [number, number] = end === 0 ? [v, b] : [a, v];
    if (next[0] !== a || next[1] !== b) {
      committed.set(next);
      scheduleOnRN(emit, next);
    }
  };

  const pan = Gesture.Pan()
    .withTestId('range-slider')
    .enabled(!disabled)
    .activeOffsetX([-3, 3])
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      const w = width.get();
      const x = (e.x - THUMB / 2) / Math.max(1, w);
      // The nearer end takes the drag; when they touch, the one in the direction of travel does.
      const dLo = Math.abs(x - lo.get());
      const dHi = Math.abs(x - hi.get());
      const end = dLo < dHi || (dLo === dHi && x < lo.get()) ? 0 : 1;
      active.set(end);
      held.set(withSpring(1, spring('snappy', reduced)));
      scheduleOnRN(setActiveEnd, end);
    })
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => {
      if (active.get() < 0) return;
      const [a, b] = committed.get();
      lo.set(withSpring((a - min) / range, spring('snappy', reduced)));
      hi.set(withSpring((b - min) / range, spring('snappy', reduced)));
      active.set(-1);
      held.set(withSpring(0, spring('smooth', reduced)));
      scheduleOnRN(finish, [a, b] as [number, number]);
    });

  const fill = useAnimatedStyle(() => ({
    left: THUMB / 2 + lo.get() * width.get(),
    width: Math.max(0, (hi.get() - lo.get()) * width.get()),
  }));
  const loThumb = useAnimatedStyle(() => ({
    transform: [
      { translateX: lo.get() * width.get() },
      { scale: 1 + (active.get() === 0 ? held.get() : 0) * 0.18 },
    ],
  }));
  const hiThumb = useAnimatedStyle(() => ({
    transform: [
      { translateX: hi.get() * width.get() },
      { scale: 1 + (active.get() === 1 ? held.get() : 0) * 0.18 },
    ],
  }));
  const bubble = useAnimatedStyle(() => {
    const end = active.get();
    const p = end === 1 ? hi.get() : lo.get();
    return {
      opacity: end < 0 ? 0 : held.get(),
      transform: [
        { translateX: THUMB / 2 + p * width.get() },
        { translateY: (1 - held.get()) * 8 },
        { scale: 0.7 + held.get() * 0.3 },
      ],
    };
  });

  const nudge = (end: 0 | 1) => (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const delta = Math.max(step, range / 20) * (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    const [a, b] = [value[0], value[1]];
    const next: [number, number] =
      end === 0
        ? [Math.max(min, Math.min(b - gap, snap((a + delta - min) / range))), b]
        : [a, Math.min(max, Math.max(a + gap, snap((b + delta - min) / range)))];
    onValueChange?.(next);
    onSlidingComplete?.(next);
  };

  const bars = histogram && histogram.length > 0 ? histogram : null;
  const peak = bars ? Math.max(1, ...bars) : 1;

  return (
    <View testID={testID} style={[{ gap: space[2], opacity: disabled ? 0.45 : 1 }, style]}>
      <View style={styles.header}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          {label}
        </Text>
        <Text
          style={{ color: colors.textMuted, fontSize: font.size.sm, fontVariant: ['tabular-nums'] }}
        >
          {formatValue(shown[0])} – {formatValue(shown[1])}
        </Text>
      </View>

      {bars ? (
        <View style={[styles.histogram, { paddingHorizontal: THUMB / 2 }]} pointerEvents="none">
          {bars.map((n, i) => {
            const at = min + ((i + 0.5) / bars.length) * range;
            const inside = at >= shown[0] && at <= shown[1];
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, (n / peak) * HISTOGRAM_H),
                    backgroundColor: inside ? withAlpha(colors.azure, 0.55) : colors.track,
                    borderTopLeftRadius: radius.xs / 2,
                    borderTopRightRadius: radius.xs / 2,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}

      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          testID={testID ? `${testID}-track` : undefined}
          style={styles.hit}
          onLayout={(e) => width.set(Math.max(0, e.nativeEvent.layout.width - THUMB))}
        >
          <View
            style={[
              styles.track,
              {
                backgroundColor: colors.track,
                borderRadius: radius.pill,
                marginHorizontal: THUMB / 2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: colors.azure, borderRadius: radius.pill },
              fill,
            ]}
          />
          {([0, 1] as const).map((end) => (
            <Animated.View
              key={end}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${label}, ${endLabels[end]}`}
              accessibilityValue={{ min, max, now: shown[end], text: formatValue(shown[end]) }}
              accessibilityState={{ disabled }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={nudge(end)}
              hitSlop={(minTouchTarget - THUMB) / 2}
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.highlight,
                  borderColor: activeEnd === end ? colors.azure : colors.borderStrong,
                  boxShadow: shadow.sm,
                },
                end === 0 ? loThumb : hiThumb,
              ]}
            />
          ))}
          <Animated.View pointerEvents="none" style={[styles.bubbleBox, bubble]}>
            <View
              style={[styles.bubble, { backgroundColor: colors.ember, borderRadius: radius.sm }]}
            >
              <Text
                style={{
                  color: colors.onEmber,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {activeEnd >= 0 ? formatValue(shown[activeEnd]!) : ''}
              </Text>
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  histogram: {
    height: HISTOGRAM_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: -minTouchTarget / 2 + TRACK / 2,
  },
  bar: { flex: 1 },
  hit: { height: minTouchTarget, justifyContent: 'center' },
  track: { height: TRACK },
  fill: { position: 'absolute', height: TRACK },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
  },
  bubbleBox: {
    position: 'absolute',
    left: 0,
    bottom: minTouchTarget - 4,
    width: 0,
    alignItems: 'center',
  },
  bubble: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
});
