import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Path,
  Skia,
  rect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
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
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type LineChartProps = {
  /** Values, oldest first. At least two. */
  data: readonly number[];
  /** One label per value (dates, months). Shown while scrubbing and under the chart's ends. */
  labels?: readonly string[];
  /** Height of the chart. Defaults to 200. */
  height?: number;
  /** Line colour. Defaults to the theme ember. */
  color?: string;
  /** Fill the area under the line with a fading gradient. Defaults to true. */
  area?: boolean;
  formatValue?: (value: number) => string;
  /** Called with the index under the finger, and null when it lifts. */
  onScrub?: (index: number | null) => void;
  /** A tick as the finger moves from point to point. Defaults to true. */
  haptics?: boolean;
  /** A summary of what the chart shows, e.g. "Revenue, last 12 months". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Room above the plot for the scrub label. */
const TOP = 40;
const BOTTOM = 10;
const SIDE = 6;
/** Pulses of the latest point after the line draws in. */
const PULSES = 3;

type Point = { x: number; y: number };

/**
 * Monotone cubic interpolation (Fritsch–Carlson): a smooth curve through
 * every point that never overshoots, so a dip never draws below its value.
 */
function curve(points: Point[]): string {
  const n = points.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1]!.x - points[i]!.x);
    slope.push((points[i + 1]!.y - points[i]!.y) / (dx[i] || 1));
  }
  const tangent: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent.push(
      a * b <= 0
        ? 0
        : (3 * (dx[i - 1]! + dx[i]!)) /
            ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b),
    );
  }
  tangent.push(slope[n - 2]!);
  let d = `M${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${p.x + h} ${p.y + tangent[i]! * h} ${q.x - h} ${q.y - tangent[i + 1]! * h} ${q.x} ${q.y}`;
  }
  return d;
}

/**
 * A smooth line chart that draws itself in. Drag across it to read any point:
 * a guide, a dot and a label follow the finger. Once drawn, the latest
 * point pulses softly a few times.
 */
export function LineChart({
  data,
  labels,
  height = 200,
  color,
  area = true,
  formatValue = (v) => String(Math.round(v * 100) / 100),
  onScrub,
  haptics = true,
  accessibilityLabel,
  style,
}: LineChartProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const ink = color ?? colors.ember;

  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [labelW, setLabelW] = useState(0);

  // Keyed on the values, not the array: a new array with the same numbers must not redraw.
  const signature = data.join(',');
  const { points, line, fill } = useMemo(() => {
    const n = data.length;
    if (width === 0 || n < 2) return { points: [] as Point[], line: null, fill: null };
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const pad = (hi - lo) * 0.08 || 1;
    const top = TOP;
    const bottom = height - BOTTOM;
    const pts = data.map((v, i) => ({
      x: SIDE + (i / (n - 1)) * (width - SIDE * 2),
      y: bottom - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (bottom - top),
    }));
    const d = curve(pts);
    const last = pts[n - 1]!;
    return {
      points: pts,
      line: Skia.Path.MakeFromSVGString(d),
      fill: Skia.Path.MakeFromSVGString(`${d} L${last.x} ${height} L${pts[0]!.x} ${height} Z`),
    };
    // `signature` stands in for `data`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, width, height]);

  // Draw in whenever the data or the size changes.
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: 1100, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [line, reduced, progress]);

  // The latest point pulses a few times once the line is drawn, then rests, so
  // a chart that is only being looked at costs no frames.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    pulse.set(0);
    pulse.set(
      withDelay(
        1100,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
          PULSES,
          false,
        ),
      ),
    );
  }, [line, reduced, pulse]);

  const index = useSharedValue(-1);
  const n = points.length;

  const pick = (x: number) => {
    'worklet';
    if (n < 2) return -1;
    const t = (x - SIDE) / (width - SIDE * 2);
    return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
  };

  const report = (i: number) => {
    setActive(i < 0 ? null : i);
    if (i >= 0) haptic('tick');
    onScrub?.(i < 0 ? null : i);
  };
  const move = (i: number) => {
    'worklet';
    if (i === index.get()) return;
    index.set(i);
    scheduleOnRN(report, i);
  };

  const pan = Gesture.Pan()
    .withTestId('line-chart')
    .enabled(n >= 2)
    .minDistance(0)
    .activeOffsetX([-2, 2])
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      move(pick(e.x));
    })
    .onStart((e) => {
      move(pick(e.x));
    })
    .onUpdate((e) => {
      move(pick(e.x));
    })
    .onFinalize(() => {
      move(-1);
    });

  // Scrub marker and resting dot, read on the UI thread.
  const marker = useDerivedValue(() => {
    const i = index.get();
    const p = points[i < 0 ? n - 1 : i];
    return p ?? { x: -100, y: -100 };
  });
  const markerC = useDerivedValue(() => vec(marker.get().x, marker.get().y));
  const guideFrom = useDerivedValue(() => vec(marker.get().x, TOP - 6));
  const guideTo = useDerivedValue(() => vec(marker.get().x, height));
  const scrubbing = useDerivedValue(() => (index.get() >= 0 ? 1 : 0));
  const resting = useDerivedValue(() => (index.get() >= 0 ? 0 : progress.get() >= 0.999 ? 1 : 0));
  const haloR = useDerivedValue(() => 5 + pulse.get() * 12);
  const haloO = useDerivedValue(() => (1 - pulse.get()) * 0.35 * resting.get());
  const reveal = useDerivedValue(() => rect(0, 0, width * progress.get(), height));

  const bubble = useAnimatedStyle(() => {
    const x = marker.get().x - labelW / 2;
    return {
      opacity: withTiming(index.get() >= 0 ? 1 : 0, { duration: 120 }),
      transform: [{ translateX: Math.max(0, Math.min(width - labelW, x)) }],
    };
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (n < 2) return;
    const current = active ?? n - 1;
    const next =
      e.nativeEvent.actionName === 'increment'
        ? Math.min(n - 1, current + 1)
        : Math.max(0, current - 1);
    setActive(next);
    onScrub?.(next);
  };

  const shown = active ?? n - 1;
  const valueText =
    n > 0
      ? `${labels?.[shown] ? `${labels[shown]}: ` : ''}${formatValue(data[shown]!)}`
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
          style={{ height }}
        >
          {/* Wrapped so touches reach the gesture on the web, where the canvas ignores pointerEvents. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              {[0, 1, 2].map((g) => {
                const y = TOP + ((height - BOTTOM - TOP) * g) / 2;
                return (
                  <Line
                    key={g}
                    p1={vec(0, y)}
                    p2={vec(width, y)}
                    color={colors.border}
                    strokeWidth={1}
                  >
                    <DashPathEffect intervals={[3, 5]} />
                  </Line>
                );
              })}
              {area && fill ? (
                <Group clip={reveal}>
                  <Path path={fill}>
                    <LinearGradient
                      start={vec(0, TOP)}
                      end={vec(0, height)}
                      colors={[withAlpha(ink, 0.22), withAlpha(ink, 0)]}
                    />
                  </Path>
                </Group>
              ) : null}
              {line ? (
                <Path
                  path={line}
                  style="stroke"
                  strokeWidth={2.25}
                  strokeCap="round"
                  strokeJoin="round"
                  color={ink}
                  end={progress}
                />
              ) : null}
              <Group opacity={scrubbing}>
                <Line p1={guideFrom} p2={guideTo} color={withAlpha(ink, 0.35)} strokeWidth={1}>
                  <DashPathEffect intervals={[2, 3]} />
                </Line>
                <Circle c={markerC} r={11} color={withAlpha(ink, 0.16)} />
              </Group>
              <Circle c={markerC} r={haloR} color={ink} opacity={haloO} />
              <Group opacity={progress}>
                <Circle c={markerC} r={5.5} color={colors.surface} />
                <Circle c={markerC} r={3.75} color={ink} />
              </Group>
            </Canvas>
          </View>
          <Animated.View
            pointerEvents="none"
            onLayout={(e) => setLabelW(e.nativeEvent.layout.width)}
            style={[
              styles.bubble,
              {
                backgroundColor: colors.text,
                borderRadius: radius.sm,
                paddingHorizontal: space[2],
              },
              bubble,
            ]}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: font.size.xs,
                fontWeight: font.weight.bold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {active !== null ? formatValue(data[active]!) : ' '}
              {active !== null && labels?.[active] ? (
                <Text
                  style={{ fontWeight: font.weight.regular, opacity: 0.7 }}
                >{`  ${labels[active]}`}</Text>
              ) : null}
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
      {labels && labels.length > 1 ? (
        <View style={[styles.axis, { marginTop: space[2] }]}>
          {[labels[0], labels[Math.floor((labels.length - 1) / 2)], labels[labels.length - 1]].map(
            (l, i) => (
              <Text key={i} style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
                {l}
              </Text>
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', top: 4, left: 0, paddingVertical: 5 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
