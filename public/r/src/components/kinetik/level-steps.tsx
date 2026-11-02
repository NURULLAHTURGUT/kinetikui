import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type LevelStepsProps = {
  /** The reading. */
  value: number;
  /** What it measures, e.g. "AEROBIC SCORE". */
  label: string;
  /** Word for the current level, e.g. "STRONG". */
  rating?: string;
  /** Where each step starts, ascending. Each one becomes a step on the staircase. */
  stops: number[];
  /** Decimal places of the reading. Defaults to 1. */
  decimals?: number;
  /** Colours of the steps, low to high. Defaults to a violet to crimson ramp. */
  tones?: string[];
  style?: StyleProp<ViewStyle>;
};

const CHART = 58;
const MARK = 5;

const RAMP = [
  'hsl(262, 42%, 30%)',
  'hsl(282, 48%, 36%)',
  'hsl(306, 54%, 40%)',
  'hsl(332, 62%, 44%)',
  'hsl(350, 66%, 38%)',
];

/**
 * Where a value sits along the staircase, 0–1. Each step is the same width
 * whatever its range, so the position is found within the step holding the value.
 */
export function stairPosition(value: number, stops: number[]): number {
  const n = stops.length;
  if (n === 0) return 0;
  if (value <= stops[0]!) return 0;
  for (let i = n - 1; i >= 0; i--) {
    const from = stops[i]!;
    if (value < from) continue;
    // The last step has no upper stop, so it borrows the width of the one before.
    const to = stops[i + 1] ?? from + (from - (stops[i - 1] ?? from - 1));
    return Math.min(1, (i + Math.min(1, (value - from) / (to - from))) / n);
  }
  return 0;
}

/**
 * A reading on a rising staircase: the steps grow up one after another and a
 * bright marker slides to the reading as the number counts up.
 */
export function LevelSteps({
  value,
  label,
  rating,
  stops,
  decimals = 1,
  tones = RAMP,
  style,
}: LevelStepsProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const shown = useCountUp(value, { instant: reduced });
  const position = stairPosition(value, stops);

  const at = useSharedValue(reduced ? position : 0);
  useEffect(() => {
    at.set(reduced ? position : withSpring(position, spring('smooth')));
  }, [position, reduced, at]);
  const marker = useAnimatedStyle(() => ({
    transform: [{ translateX: at.get() * Math.max(0, width - MARK) }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={`${label} ${value.toFixed(decimals)}${rating ? `, ${rating}` : ''}`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <View>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.xl,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {shown.toFixed(decimals)}
          </Text>
          <Text style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}>
            {label}
          </Text>
        </View>
        {rating ? (
          <Text style={{ color: RATING, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
            {rating}
          </Text>
        ) : null}
      </View>

      <View
        testID="level-steps-chart"
        style={styles.chart}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {stops.map((stop, i) => (
          <Step
            key={stop}
            index={i}
            height={CHART * (0.3 + (0.7 * (i + 1)) / stops.length)}
            tone={tones[i % tones.length]!}
            next={tones[Math.min(i + 1, tones.length - 1)]!}
          />
        ))}
        <Animated.View style={[styles.marker, marker]} />
      </View>

      <View style={styles.scale}>
        {stops.map((stop, i) => (
          <Text key={stop} style={[styles.tick, { color: MUTED, fontSize: font.size.xs - 1 }]}>
            {i === 0 ? '>' : ''}
            {stop}
            {i === stops.length - 1 ? '+' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Step({
  index,
  height,
  tone,
  next,
}: {
  index: number;
  height: number;
  tone: string;
  next: string;
}) {
  const reduced = useReduceMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    grow.set(reduced ? 1 : withDelay(index * 70, withSpring(1, spring('smooth'))));
  }, [index, reduced, grow]);
  const rise = useAnimatedStyle(() => ({ height: Math.max(0, grow.get() * height) }));
  return (
    <Animated.View
      style={[styles.step, gradient(`linear-gradient(90deg, ${tone} 0%, ${next} 100%)`), rise]}
    />
  );
}

const MUTED = 'hsl(0, 0%, 62%)';
const RATING = 'hsl(350, 90%, 62%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    padding: 16,
    gap: 8,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART, gap: 2, marginTop: -18 },
  step: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderTopWidth: 1.5,
    borderTopColor: 'hsla(0, 0%, 100%, 0.32)',
  },
  marker: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: MARK,
    height: CHART * 0.72,
    borderRadius: 2,
    backgroundColor: 'hsl(340, 100%, 90%)',
    boxShadow: '0px 0px 14px hsla(335, 100%, 66%, 0.9)',
  },
  scale: { flexDirection: 'row' },
  tick: { flex: 1, fontVariant: ['tabular-nums'] },
});
