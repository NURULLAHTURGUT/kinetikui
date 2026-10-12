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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type BarDatum = { label: string; value: number };

export type BarChartProps = {
  data: readonly BarDatum[];
  /** Height of the bars' area. Defaults to 180. */
  height?: number;
  /** Bar colour. Defaults to the theme ember. */
  color?: string;
  /** The value the tallest bar reaches. Defaults to the largest value. */
  max?: number;
  formatValue?: (value: number) => string;
  /** Called with the selected bar, or null when the selection clears. */
  onSelect?: (index: number | null) => void;
  /** A tick as the finger moves from bar to bar. Defaults to true. */
  haptics?: boolean;
  /** A summary of what the chart shows, e.g. "Steps per day this week". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Bars never get wider than this, however few there are. */
const BAR = 28;
/** Room above the bars for the value label. */
const HEADROOM = 30;

/**
 * Bars that spring up one after another. Drag across them to read values:
 * the bar under the finger stays bright, the rest step back, and its value
 * floats above it. Tap the selected bar again to clear.
 */
export function BarChart({
  data,
  height = 180,
  color,
  max,
  formatValue = (v) => String(v),
  onSelect,
  haptics = true,
  accessibilityLabel,
  style,
}: BarChartProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const ink = color ?? colors.ember;
  const n = data.length;
  const top = max ?? Math.max(1, ...data.map((d) => d.value));

  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const index = useSharedValue(-1);
  const start = useSharedValue(-1);

  const choose = (i: number) => {
    const next = i < 0 ? null : i;
    setSelected(next);
    if (next !== null) haptic('tick');
    onSelect?.(next);
  };
  const move = (i: number) => {
    'worklet';
    if (i === index.get()) return;
    index.set(i);
    scheduleOnRN(choose, i);
  };

  const pick = (x: number) => {
    'worklet';
    if (n === 0 || width === 0) return -1;
    return Math.max(0, Math.min(n - 1, Math.floor((x / width) * n)));
  };

  // While dragging, follow the finger; a bar that was just cleared by a tap
  // stays clear until the finger moves to another bar.
  const follow = (x: number) => {
    'worklet';
    const i = pick(x);
    if (i !== start.get() || index.get() >= 0) move(i);
  };

  const pan = Gesture.Pan()
    .withTestId('bar-chart')
    .enabled(n > 0)
    .minDistance(0)
    .activeOffsetX([-2, 2])
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      start.set(index.get());
      const i = pick(e.x);
      // A tap on the selected bar clears the selection.
      move(i === start.get() ? -1 : i);
    })
    .onStart((e) => {
      follow(e.x);
    })
    .onUpdate((e) => {
      follow(e.x);
    });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (n === 0) return;
    const current = selected ?? -1;
    const next =
      e.nativeEvent.actionName === 'increment'
        ? Math.min(n - 1, current + 1)
        : Math.max(0, current - 1);
    index.set(next);
    choose(next);
  };

  const focus = selected ?? -1;
  const valueText =
    selected !== null && data[selected]
      ? `${data[selected]!.label}: ${formatValue(data[selected]!.value)}`
      : undefined;

  return (
    <View style={style}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={valueText ? { text: valueText } : undefined}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[styles.plot, { height: height + HEADROOM, gap: n > 12 ? 4 : 10 }]}
        >
          {data.map((d, i) => (
            <Bar
              key={`${d.label}-${i}`}
              index={i}
              value={d.value}
              max={top}
              height={height}
              color={ink}
              focus={focus}
              selection={index}
              reduced={reduced}
              label={selected === i ? formatValue(d.value) : null}
            />
          ))}
        </View>
      </GestureDetector>
      <View style={[styles.labels, { gap: n > 12 ? 4 : 10, marginTop: space[2] }]}>
        {data.map((d, i) => (
          <Text
            key={`${d.label}-${i}`}
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: selected === i ? colors.text : colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: selected === i ? font.weight.semibold : font.weight.regular,
              },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({
  index,
  value,
  max,
  height,
  color,
  focus,
  selection,
  reduced,
  label,
}: {
  index: number;
  value: number;
  max: number;
  height: number;
  color: string;
  focus: number;
  selection: SharedValue<number>;
  reduced: boolean;
  label: string | null;
}) {
  const { colors, font, radius } = useKinetikTheme();
  const target = Math.max(0, Math.min(1, value / max)) * height;
  const h = useSharedValue(reduced ? target : 0);

  // Grow in a wave from the left; later changes spring straight to the new value.
  const first = useSharedValue(true);
  useEffect(() => {
    if (reduced) {
      h.set(withTiming(target, timing('quick', true)));
      return;
    }
    const grow = withSpring(target, spring('smooth'));
    h.set(first.get() ? withDelay(index * 55, grow) : grow);
    first.set(false);
  }, [target, reduced, index, h, first]);

  const bar = useAnimatedStyle(() => {
    const s = selection.get();
    const dim = s >= 0 && s !== index;
    return {
      height: Math.max(4, h.get()),
      opacity: withTiming(dim ? 0.28 : 1, { duration: 160 }),
    };
  });
  const tag = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(4, h.get()) - 8 }],
  }));

  return (
    <View style={styles.column}>
      {/* A faint full-height track behind each bar shows how far it could go. */}
      <View
        style={[
          styles.track,
          { height, backgroundColor: colors.track, borderRadius: radius.sm, opacity: 0.55 },
        ]}
      />
      <Animated.View
        style={[styles.bar, { backgroundColor: color, borderRadius: radius.sm }, bar]}
      />
      {label !== null && focus === index ? (
        <Animated.View pointerEvents="none" style={[styles.tag, tag]}>
          <View
            style={{
              backgroundColor: colors.text,
              borderRadius: radius.xs,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: font.size.xs,
                fontWeight: font.weight.bold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {label}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', maxWidth: BAR },
  track: { position: 'absolute', bottom: 0, width: '100%', maxWidth: BAR },
  tag: { position: 'absolute', bottom: 0, alignItems: 'center', minWidth: 60 },
  labels: { flexDirection: 'row' },
  label: { flex: 1, textAlign: 'center' },
});
