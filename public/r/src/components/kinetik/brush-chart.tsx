import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type BrushChartProps = {
  /** The series, oldest first. */
  data: readonly number[];
  /** One label per point, e.g. dates. Defaults to the point numbers. */
  labels?: readonly string[];
  /** The part shown at first, as fractions of the series. Defaults to the last third. */
  initialWindow?: readonly [number, number];
  onWindowChange?: (range: [number, number]) => void;
  /** Formats values in the readout and for screen readers. */
  formatValue?: (value: number) => string;
  /** Main chart height. Defaults to 180. */
  height?: number;
  /** What the series is, e.g. "Daily visitors". */
  accessibilityLabel: string;
  /** A tick when the window settles. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const OVERVIEW = 52;
const HANDLE = 22;
const PAD_Y = 14;

type Window = { start: number; end: number };

/** The first and last point indices inside a window of fractions. */
export function windowIndices(n: number, start: number, end: number): [number, number] {
  'worklet';
  const last = Math.max(0, n - 1);
  return [
    Math.max(0, Math.floor(start * last + 1e-6)),
    Math.min(last, Math.ceil(end * last - 1e-6)),
  ];
}

function linePath(
  data: readonly number[],
  i0: number,
  i1: number,
  x: (i: number) => number,
  y: (v: number) => number,
): SkPath {
  'worklet';
  const b = Skia.PathBuilder.Make();
  for (let i = i0; i <= i1; i++) {
    if (i === i0) b.moveTo(x(i), y(data[i]!));
    else b.lineTo(x(i), y(data[i]!));
  }
  return b.detach();
}

/**
 * A dense series with an overview strip. Drag the window in the strip to
 * move through time, pull its handles to zoom, or tap outside it to jump;
 * the main chart above redraws the part inside the window on the UI thread,
 * rescaling as it goes. React only hears about the window when it settles.
 */
export function BrushChart({
  data,
  labels,
  initialWindow = [2 / 3, 1],
  onWindowChange,
  formatValue = (v) => String(Math.round(v)),
  height = 180,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: BrushChartProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const n = data.length;
  const minSpan = n > 1 ? Math.max(4 / (n - 1), 0.04) : 1;

  const start = useSharedValue(initialWindow[0]);
  const end = useSharedValue(initialWindow[1]);
  const begin = useSharedValue<Window>({ start: 0, end: 1 });
  // The strip width for the gesture, which runs on the UI thread.
  const strip = useSharedValue(0);
  const mode = useSharedValue<'move' | 'left' | 'right'>('move');
  const [range, setRange] = useState<[number, number]>(() =>
    windowIndices(n, initialWindow[0], initialWindow[1]),
  );

  const label = (i: number) => labels?.[i] ?? String(i + 1);
  const report = (i0: number, i1: number) => {
    setRange((r) => (r[0] === i0 && r[1] === i1 ? r : [i0, i1]));
  };
  const commit = (i0: number, i1: number) => {
    haptic('tick');
    report(i0, i1);
    onWindowChange?.([i0, i1]);
  };

  // The whole series in the overview strip, drawn once per size.
  const overview = useMemo(() => {
    if (width === 0 || n < 2) return null;
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const span = hi - lo || 1;
    const x = (i: number) => (i / (n - 1)) * width;
    const y = (v: number) => 6 + (1 - (v - lo) / span) * (OVERVIEW - 12);
    return linePath(data, 0, n - 1, x, y);
  }, [data, n, width]);

  // The main chart: the window's points, scaled to the window's own range.
  const main = useDerivedValue(() => {
    const [i0, i1] = windowIndices(n, start.get(), end.get());
    if (width === 0 || i1 <= i0)
      return {
        line: Skia.PathBuilder.Make().detach(),
        area: Skia.PathBuilder.Make().detach(),
        lastX: 0,
        lastY: 0,
      };
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = i0; i <= i1; i++) {
      lo = Math.min(lo, data[i]!);
      hi = Math.max(hi, data[i]!);
    }
    const span = hi - lo || 1;
    const s = start.get();
    const k = width / Math.max(1e-6, end.get() - s);
    const x = (i: number) => (i / (n - 1) - s) * k;
    const y = (v: number) => PAD_Y + (1 - (v - lo) / span) * (height - PAD_Y * 2);
    const line = linePath(data, i0, i1, x, y);
    const area = Skia.PathBuilder.Make()
      .addPath(line)
      .lineTo(x(i1), height)
      .lineTo(x(i0), height)
      .close()
      .detach();
    return { line, area, lastX: x(i1), lastY: y(data[i1]!) };
  });
  const line = useDerivedValue(() => main.get().line);
  const area = useDerivedValue(() => main.get().area);
  const lastX = useDerivedValue(() => main.get().lastX);
  const lastY = useDerivedValue(() => main.get().lastY);

  const winX = useDerivedValue(() => start.get() * width);
  const winW = useDerivedValue(() => (end.get() - start.get()) * width);
  const leftShade = useDerivedValue(() => start.get() * width);
  const rightX = useDerivedValue(() => end.get() * width);
  const rightW = useDerivedValue(() => (1 - end.get()) * width);
  const handleL = useDerivedValue(() => start.get() * width - 2);
  const handleR = useDerivedValue(() => end.get() * width - 2);

  const pan = Gesture.Pan()
    .withTestId('brush-chart')
    .minDistance(0)
    .onBegin((e) => {
      const width = strip.get();
      if (width === 0) return;
      const sx = start.get() * width;
      const ex = end.get() * width;
      if (Math.abs(e.x - sx) <= HANDLE && Math.abs(e.x - sx) <= Math.abs(e.x - ex)) {
        mode.set('left');
      } else if (Math.abs(e.x - ex) <= HANDLE) {
        mode.set('right');
      } else {
        mode.set('move');
        if (e.x < sx || e.x > ex) {
          // A tap outside the window centres it there.
          const half = (end.get() - start.get()) / 2;
          const c = Math.max(half, Math.min(1 - half, e.x / width));
          start.set(c - half);
          end.set(c + half);
        }
      }
      begin.set({ start: start.get(), end: end.get() });
    })
    .onUpdate((e) => {
      const width = strip.get();
      if (width === 0) return;
      const d = e.translationX / width;
      const b = begin.get();
      const m = mode.get();
      if (m === 'move') {
        const span = b.end - b.start;
        const s = Math.max(0, Math.min(1 - span, b.start + d));
        start.set(s);
        end.set(s + span);
      } else if (m === 'left') {
        start.set(Math.max(0, Math.min(b.end - minSpan, b.start + d)));
      } else {
        end.set(Math.min(1, Math.max(b.start + minSpan, b.end + d)));
      }
    })
    .onFinalize(() => {
      const [i0, i1] = windowIndices(n, start.get(), end.get());
      scheduleOnRN(commit, i0, i1);
    });

  const nudge = (e: AccessibilityActionEvent) => {
    const span = end.get() - start.get();
    const step = span * 0.5 * (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    const s = Math.max(0, Math.min(1 - span, start.get() + step));
    start.set(reduced ? s : withSpring(s, spring('smooth')));
    end.set(reduced ? s + span : withSpring(s + span, spring('smooth')));
    const [i0, i1] = windowIndices(n, s, s + span);
    commit(i0, i1);
  };

  const [a, b] = range;
  const first = data[a];
  const last = data[b];
  const change =
    first !== undefined && last !== undefined && first !== 0 ? (last - first) / Math.abs(first) : 0;
  const summary = `${label(a)} to ${label(b)}`;

  return (
    <View testID={testID} style={[{ gap: space[3] }, style]}>
      <View style={styles.readout}>
        <View style={styles.grow}>
          <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{summary}</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.xl,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {last !== undefined ? formatValue(last) : '–'}
          </Text>
        </View>
        <Text
          style={{
            color: change >= 0 ? colors.success : colors.danger,
            fontSize: font.size.sm,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {change >= 0 ? '+' : '−'}
          {Math.abs(change * 100).toFixed(1)}%
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}, ${summary}, from ${first !== undefined ? formatValue(first) : '–'} to ${last !== undefined ? formatValue(last) : '–'}`}
        style={{ height }}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          strip.set(e.nativeEvent.layout.width);
        }}
      >
        {width > 0 ? (
          <Canvas style={{ width, height }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                p1={vec(0, height * f)}
                p2={vec(width, height * f)}
                color={colors.border}
                strokeWidth={1}
                style="stroke"
              />
            ))}
            <Path path={area}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, height)}
                colors={[withAlpha(colors.azure, 0.28), withAlpha(colors.azure, 0)]}
              />
            </Path>
            <Path
              path={line}
              style="stroke"
              strokeWidth={2}
              strokeJoin="round"
              color={colors.azure}
            />
            <Circle cx={lastX} cy={lastY} r={4} color={colors.azure} />
          </Canvas>
        ) : null}
      </View>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${accessibilityLabel} range`}
          accessibilityValue={{ text: summary }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={nudge}
          style={[styles.overview, { backgroundColor: colors.surface, borderRadius: radius.sm }]}
        >
          {width > 0 && overview ? (
            <Canvas style={{ width, height: OVERVIEW }}>
              <Path path={overview} style="stroke" strokeWidth={1.25} color={colors.textSubtle} />
              <Rect
                x={0}
                y={0}
                width={leftShade}
                height={OVERVIEW}
                color={withAlpha(colors.background, 0.55)}
              />
              <Rect
                x={rightX}
                y={0}
                width={rightW}
                height={OVERVIEW}
                color={withAlpha(colors.background, 0.55)}
              />
              <Group>
                <Rect
                  x={winX}
                  y={0}
                  width={winW}
                  height={OVERVIEW}
                  color={withAlpha(colors.azure, 0.12)}
                />
                <Rect
                  x={winX}
                  y={0.75}
                  width={winW}
                  height={OVERVIEW - 1.5}
                  color={colors.azure}
                  style="stroke"
                  strokeWidth={1.5}
                />
              </Group>
              <RoundedRect
                x={handleL}
                y={OVERVIEW / 2 - 10}
                width={4}
                height={20}
                r={2}
                color={colors.azure}
              />
              <RoundedRect
                x={handleR}
                y={OVERVIEW / 2 - 10}
                width={4}
                height={20}
                r={2}
                color={colors.azure}
              />
            </Canvas>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  grow: { flex: 1, gap: 2 },
  overview: { height: OVERVIEW, overflow: 'hidden' },
});
