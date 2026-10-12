import { Canvas, Circle, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type RadarSeries = {
  key: string;
  label: string;
  /** One value per axis, in the same order. */
  values: readonly number[];
  /** Defaults to the theme's azure, sky and success in turn. */
  color?: string;
};

export type RadarChartProps = {
  /** Three to eight axis names, clockwise from the top. */
  axes: readonly string[];
  /** One to three series. */
  series: readonly RadarSeries[];
  /** The value at the outer ring. Defaults to the largest value. */
  max?: number;
  /** Diameter of the web, without labels. Defaults to 220. */
  size?: number;
  /** Rings in the web. Defaults to 4. */
  rings?: number;
  formatValue?: (value: number) => string;
  /** Rows under the chart; tap one to show or hide its series. Defaults to true. */
  legend?: boolean;
  /** A tick when a series is shown or hidden. Defaults to true. */
  haptics?: boolean;
  /** What the chart compares, e.g. "Two trails compared". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Room around the web for the axis names. */
const LABEL_ROOM = 44;
const LABEL_W = 84;

/**
 * A radar chart whose shapes grow out from the centre, and morph from one
 * set of values to the next when the data changes. Tap a legend row to show
 * or hide a series.
 */
export function RadarChart({
  axes,
  series,
  max,
  size = 220,
  rings = 4,
  formatValue = (v) => String(Math.round(v)),
  legend = true,
  haptics = true,
  accessibilityLabel,
  style,
}: RadarChartProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const n = axes.length;
  const box = size + LABEL_ROOM * 2;
  const c = box / 2;
  const R = size / 2;
  const top = max ?? Math.max(1, ...series.flatMap((s) => s.values));
  const palette = [colors.azure, colors.sky, colors.success];
  const tint = (s: RadarSeries, i: number) => s.color ?? palette[i % palette.length]!;

  // Unit vectors for each axis, clockwise from 12 o'clock.
  const spokes = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return { x: Math.cos(a), y: Math.sin(a) };
      }),
    [n],
  );

  const web = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let r = 1; r <= rings; r++) {
      const k = (R * r) / rings;
      spokes.forEach((s, i) =>
        i === 0 ? b.moveTo(c + s.x * k, c + s.y * k) : b.lineTo(c + s.x * k, c + s.y * k),
      );
      b.close();
    }
    for (const s of spokes) {
      b.moveTo(c, c);
      b.lineTo(c + s.x * R, c + s.y * R);
    }
    return b.detach();
  }, [spokes, rings, R, c]);

  const toggle = (key: string) => {
    haptic('tick');
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <View style={[{ gap: space[3], alignItems: 'center' }, style]}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}. ${series
          .map(
            (s) =>
              `${s.label}: ${axes.map((a, i) => `${a} ${formatValue(s.values[i] ?? 0)}`).join(', ')}`,
          )
          .join('. ')}`}
        style={{ width: box, height: box }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Path path={web} style="stroke" strokeWidth={1} color={colors.border} />
            {series.map((s, i) => (
              <Shape
                key={s.key}
                values={s.values}
                spokes={spokes}
                center={c}
                radius={R}
                top={top}
                color={tint(s, i)}
                surface={colors.surface}
                shown={!hidden.has(s.key)}
                delay={i * 120}
                reduced={reduced}
              />
            ))}
          </Canvas>
        </View>
        {axes.map((name, i) => {
          const s = spokes[i]!;
          const x = c + s.x * (R + 22);
          const y = c + s.y * (R + 22);
          return (
            <Text
              key={name}
              numberOfLines={2}
              style={[
                styles.axis,
                {
                  left: x - LABEL_W / 2,
                  top: y - 9,
                  color: colors.textMuted,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.medium,
                },
              ]}
            >
              {name}
            </Text>
          );
        })}
      </View>

      {legend ? (
        <View style={[styles.legend, { gap: space[2] }]}>
          {series.map((s, i) => {
            const on = !hidden.has(s.key);
            return (
              <Pressable
                key={s.key}
                onPress={() => toggle(s.key)}
                accessibilityRole="switch"
                accessibilityLabel={s.label}
                accessibilityState={{ checked: on }}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.pill,
                    borderColor: on ? withAlpha(tint(s, i), 0.5) : colors.border,
                    backgroundColor: on ? withAlpha(tint(s, i), 0.12) : 'transparent',
                    paddingHorizontal: space[3],
                  },
                ]}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: on ? tint(s, i) : 'transparent', borderColor: tint(s, i) },
                  ]}
                />
                <Text
                  style={{
                    color: on ? colors.text : colors.textSubtle,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.medium,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** One series: grows out from the centre, then morphs whenever its values change. */
function Shape({
  values,
  spokes,
  center,
  radius,
  top,
  color,
  surface,
  shown,
  delay,
  reduced,
}: {
  values: readonly number[];
  spokes: readonly { x: number; y: number }[];
  center: number;
  radius: number;
  top: number;
  color: string;
  surface: string;
  shown: boolean;
  delay: number;
  reduced: boolean;
}) {
  // Shares of the outer ring; the first shape starts from the centre.
  const to = spokes.map((_, i) => Math.max(0, Math.min(1.1, (values[i] ?? 0) / top)));
  const signature = to.join(',');
  const pair = useSharedValue({ from: spokes.map(() => 0), to });
  const t = useSharedValue(reduced ? 1 : 0);
  const fade = useSharedValue(shown ? 1 : 0);

  useEffect(() => {
    // Morph from wherever the shape is now, even mid-morph.
    const k = t.get();
    const now = pair.get();
    const at = to.map((_, i) => {
      const a = now.from[i] ?? 0;
      return a + ((now.to[i] ?? 0) - a) * k;
    });
    pair.set({ from: at, to });
    if (reduced) {
      t.set(1);
      return;
    }
    t.set(0);
    const run = withTiming(1, { duration: 900, easing: Easing.bezier(0.2, 0, 0, 1) });
    // Series grow out one after another the first time; later changes morph together.
    const first = at.every((v) => v === 0);
    t.set(first ? withDelay(delay, run) : run);
    // `signature` stands in for `to`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, reduced]);
  useEffect(() => {
    fade.set(withTiming(shown ? 1 : 0, timing('base', reduced)));
  }, [shown, reduced, fade]);

  const points = useDerivedValue(() => {
    const k = t.get();
    const { from: a, to: b } = pair.get();
    return spokes.map((s, i) => {
      const v = (a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * k;
      return { x: center + s.x * radius * v, y: center + s.y * radius * v };
    });
  });
  const path = useDerivedValue<SkPath>(() => {
    const b = Skia.PathBuilder.Make();
    points.get().forEach((p, i) => (i === 0 ? b.moveTo(p.x, p.y) : b.lineTo(p.x, p.y)));
    return b.close().detach();
  });

  return (
    <Group opacity={fade}>
      <Path path={path} color={withAlpha(color, 0.18)} />
      <Path path={path} style="stroke" strokeWidth={2} strokeJoin="round" color={color} />
      {spokes.map((_, i) => (
        <Vertex key={i} index={i} points={points} color={color} surface={surface} />
      ))}
    </Group>
  );
}

function Vertex({
  index,
  points,
  color,
  surface,
}: {
  index: number;
  points: SharedValue<{ x: number; y: number }[]>;
  color: string;
  surface: string;
}) {
  const c = useDerivedValue(() => points.get()[index] ?? { x: 0, y: 0 });
  return (
    <>
      <Circle c={c} r={4} color={surface} />
      <Circle c={c} r={2.75} color={color} />
    </>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', width: LABEL_W, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
