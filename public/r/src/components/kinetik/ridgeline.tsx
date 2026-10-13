import { Canvas, Group, Line, Path, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type RidgeGroup = {
  key: string;
  label: string;
  /** Raw samples; the curve is a smoothed estimate of how they are spread. */
  values: readonly number[];
};

export type RidgelineProps = {
  groups: readonly RidgeGroup[];
  /** The range on the x axis. Defaults to the range of all samples. */
  domain?: readonly [number, number];
  /** Formats values on the axis, in the readout and for screen readers. */
  formatValue?: (value: number) => string;
  /** The colour behind the chart, used to keep ridges in front solid. Defaults to the theme surface. */
  ground?: string;
  /** What the chart shows, e.g. "Commute times by city". */
  accessibilityLabel: string;
  /** A tick when a ridge is lifted. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 44;
const RISE = ROW * 1.7;
const LABEL_W = 76;
const STEPS = 64;

/** The value below which a share `q` of sorted samples falls. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

/** A Gaussian kernel density estimate at `STEPS` points across the domain. */
export function density(values: readonly number[], lo: number, hi: number): number[] {
  const n = values.length;
  if (n === 0) return new Array<number>(STEPS).fill(0);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || (hi - lo) / 10 || 1;
  const bw = 1.06 * sd * n ** -0.2;
  return Array.from({ length: STEPS }, (_, i) => {
    const x = lo + ((hi - lo) * i) / (STEPS - 1);
    let sum = 0;
    for (const v of values) sum += Math.exp(-0.5 * ((x - v) / bw) ** 2);
    return sum / (n * bw * Math.sqrt(2 * Math.PI));
  });
}

/**
 * Overlapping distributions, one ridge per group. The ridges rise from their
 * baselines one after another; tap a row and its ridge lifts in front while
 * the others fade back, with its median and middle half marked beneath.
 */
export function Ridgeline({
  groups,
  domain,
  formatValue = (v) => String(Math.round(v)),
  ground,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: RidgelineProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const plotW = Math.max(0, width - LABEL_W);
  const top = RISE - ROW + 8;
  const height = top + groups.length * ROW;

  const all = groups.flatMap((g) => g.values);
  const lo = domain?.[0] ?? (all.length ? Math.min(...all) : 0);
  const hi = domain?.[1] ?? (all.length ? Math.max(...all) : 1);
  const x = (v: number) => LABEL_W + ((v - lo) / (hi - lo || 1)) * plotW;

  const stats = useMemo(
    () =>
      groups.map((g) => {
        const sorted = [...g.values].sort((a, b) => a - b);
        return {
          q1: quantile(sorted, 0.25),
          median: quantile(sorted, 0.5),
          q3: quantile(sorted, 0.75),
          curve: density(g.values, lo, hi),
        };
      }),
    [groups, lo, hi],
  );
  const peak = Math.max(1e-9, ...stats.flatMap((s) => s.curve));

  const ridges = useMemo(() => {
    if (plotW === 0) return [];
    return stats.map((s, r) => {
      const base = top + (r + 1) * ROW - 6;
      const b = Skia.PathBuilder.Make();
      const pts = s.curve.map((d, i) => ({
        x: LABEL_W + (plotW * i) / (STEPS - 1),
        y: base - (d / peak) * RISE,
      }));
      b.moveTo(pts[0]!.x, base);
      for (const p of pts) b.lineTo(p.x, p.y);
      b.lineTo(pts[pts.length - 1]!.x, base);
      const fill = b.close().detach();
      const line = Skia.PathBuilder.Make();
      pts.forEach((p, i) => (i === 0 ? line.moveTo(p.x, p.y) : line.lineTo(p.x, p.y)));
      return { fill, line: line.detach(), base };
    });
  }, [stats, plotW, peak, top]);

  const fi = groups.findIndex((g) => g.key === focus);
  const fs = fi >= 0 ? stats[fi] : undefined;

  return (
    <View testID={testID} style={[{ gap: space[2] }, style]}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, minHeight: 20 }}>
        {fs && fi >= 0
          ? `${groups[fi]!.label}: median ${formatValue(fs.median)} · middle half ${formatValue(fs.q1)}–${formatValue(fs.q3)}`
          : 'Tap a row to compare it'}
      </Text>
      <View
        accessibilityLabel={accessibilityLabel}
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Canvas style={[StyleSheet.absoluteFill]} pointerEvents="none">
            {/* The lifted ridge is drawn last so it sits in front of its neighbours. */}
            {ridges
              .map((r, i) => ({ r, i }))
              .sort((a, b) => (a.i === fi ? 1 : 0) - (b.i === fi ? 1 : 0))
              .map(({ r, i }) => (
                <Ridge
                  key={groups[i]!.key}
                  index={i}
                  fill={r.fill}
                  line={r.line}
                  base={r.base}
                  ground={ground ?? colors.surface}
                  state={focus === null ? 'rest' : focus === groups[i]!.key ? 'up' : 'back'}
                  reduced={reduced}
                />
              ))}
            {fs && fi >= 0
              ? [fs.q1, fs.median, fs.q3].map((v, k) => (
                  <Line
                    key={k}
                    p1={vec(x(v), ridges[fi]!.base - (k === 1 ? 14 : 8) - 6)}
                    p2={vec(x(v), ridges[fi]!.base - 6)}
                    color={k === 1 ? colors.text : colors.textMuted}
                    strokeWidth={k === 1 ? 2 : 1.5}
                    style="stroke"
                  />
                ))
              : null}
          </Canvas>
        ) : null}
        {groups.map((g, i) => {
          const s = stats[i]!;
          const on = focus === g.key;
          return (
            <Pressable
              key={g.key}
              onPress={() => {
                haptic('tick');
                setFocus((f) => (f === g.key ? null : g.key));
              }}
              accessibilityRole="button"
              accessibilityLabel={`${g.label}, median ${formatValue(s.median)}, middle half ${formatValue(s.q1)} to ${formatValue(s.q3)}`}
              accessibilityState={{ selected: on }}
              style={[styles.row, { top: top + i * ROW }]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: on ? colors.text : colors.textMuted,
                    fontSize: font.size.sm,
                    fontWeight: on ? font.weight.semibold : font.weight.regular,
                  },
                ]}
              >
                {g.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.axis, { marginLeft: LABEL_W }]}>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{formatValue(lo)}</Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{formatValue(hi)}</Text>
      </View>
    </View>
  );
}

type RidgeProps = {
  index: number;
  fill: SkPath;
  line: SkPath;
  base: number;
  ground: string;
  state: 'rest' | 'up' | 'back';
  reduced: boolean;
};

function Ridge({ index, fill, line, base, ground, state, reduced }: RidgeProps) {
  const { colors } = useKinetikTheme();
  const grow = useSharedValue(reduced ? 1 : 0);
  const lift = useSharedValue(0);
  const dim = useSharedValue(1);
  useEffect(() => {
    grow.set(reduced ? 1 : withDelay(index * 70, withSpring(1, spring('smooth'))));
  }, [index, reduced, grow]);
  useEffect(() => {
    lift.set(withSpring(state === 'up' ? 1 : 0, spring('smooth', reduced)));
    dim.set(withTiming(state === 'back' ? 0.3 : 1, timing('base', reduced)));
  }, [state, reduced, lift, dim]);

  const transform = useDerivedValue(() => [
    { translateY: base - lift.get() * 6 },
    { scaleY: Math.max(0.001, grow.get()) * (1 + lift.get() * 0.08) },
    { translateY: -base },
  ]);
  const opacity = useDerivedValue(() => dim.get());
  // One opaque fill: the ground tinted towards blue, so ridges in front hide the ones behind.
  const tint = useDerivedValue(() =>
    interpolateColor(0.14 + lift.get() * 0.22, [0, 1], [ground, colors.azure]),
  );

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={fill} color={tint} />
      <Path path={line} style="stroke" strokeWidth={1.6} strokeJoin="round" color={colors.azure} />
    </Group>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, height: ROW, justifyContent: 'flex-end' },
  label: { width: LABEL_W - 8, paddingBottom: 8 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
