import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type StreamLayer = {
  key: string;
  label: string;
  /** One value per step; every layer needs the same number of values. */
  values: readonly number[];
  /** Overrides the layer's colour. */
  color?: string;
};

export type StreamGraphProps = {
  layers: readonly StreamLayer[];
  /** Plot height. Defaults to 200. */
  height?: number;
  /** Formats totals in the readout and for screen readers. */
  formatValue?: (value: number) => string;
  /** What the graph shows, e.g. "Listening by genre". */
  accessibilityLabel: string;
  /** A tick when a layer is isolated. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD = 6;

/**
 * Builds one closed, smooth shape per layer, stacked around a centred
 * baseline so the whole stream wiggles about the middle. Every shape has the
 * same structure for a given number of steps, so two datasets can morph.
 */
export function streamPaths(
  layers: readonly { values: readonly number[] }[],
  width: number,
  height: number,
): SkPath[] {
  const steps = Math.max(0, ...layers.map((l) => l.values.length));
  if (steps < 2 || width === 0) return layers.map(() => Skia.PathBuilder.Make().detach());
  const totals = Array.from({ length: steps }, (_, t) =>
    layers.reduce((sum, l) => sum + Math.max(0, l.values[t] ?? 0), 0),
  );
  const peak = Math.max(1, ...totals);
  const k = (height - PAD * 2) / peak;
  const x = (t: number) => (t / (steps - 1)) * width;
  const mid = height / 2;
  const below = totals.map((total) => mid - (total * k) / 2);
  return layers.map((layer) => {
    const lo = below.map((y) => y);
    const hi = lo.map((y, t) => y + Math.max(0, layer.values[t] ?? 0) * k);
    for (let t = 0; t < steps; t++) below[t] = hi[t]!;
    const b = Skia.PathBuilder.Make();
    b.moveTo(x(0), hi[0]!);
    curve(b, hi, x, false);
    b.lineTo(x(steps - 1), lo[steps - 1]!);
    curve(b, lo, x, true);
    b.close();
    return b.detach();
  });
}

/** Catmull-Rom through the points as cubic Béziers, forwards or backwards. */
function curve(
  b: ReturnType<typeof Skia.PathBuilder.Make>,
  ys: number[],
  x: (t: number) => number,
  back: boolean,
) {
  const n = ys.length;
  const at = (i: number) => (back ? n - 1 - i : i);
  for (let s = 0; s < n - 1; s++) {
    const p0 = at(Math.max(0, s - 1));
    const p1 = at(s);
    const p2 = at(s + 1);
    const p3 = at(Math.min(n - 1, s + 2));
    const c1x = x(p1) + (x(p2) - x(p0)) / 6;
    const c1y = ys[p1]! + (ys[p2]! - ys[p0]!) / 6;
    const c2x = x(p2) - (x(p3) - x(p1)) / 6;
    const c2y = ys[p2]! - (ys[p3]! - ys[p1]!) / 6;
    b.cubicTo(c1x, c1y, c2x, c2y, x(p2), ys[p2]!);
  }
}

/**
 * Layered streams on a centred baseline. New data morphs every shape into
 * place, and tapping a layer (or its key) lifts it while the others fade back,
 * with its total in the readout.
 */
export function StreamGraph({
  layers,
  height = 200,
  formatValue = (v) => String(Math.round(v)),
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: StreamGraphProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);

  const palette = [
    colors.azure,
    colors.sky,
    colors.ice,
    withAlpha(colors.azure, 0.55),
    withAlpha(colors.sky, 0.5),
    withAlpha(colors.ice, 0.5),
  ];
  const tint = (i: number) => layers[i]?.color ?? palette[i % palette.length]!;

  // Keyed on the numbers, so a parent passing a fresh but equal array does not morph.
  const dataKey = JSON.stringify(layers.map((l) => l.values));
  const next = useMemo(
    () => streamPaths(layers, width, height),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataKey, width, height],
  );
  // Shapes morph from the previous dataset; the first one grows out of the baseline.
  const [shapes, setShapes] = useState<{ next: SkPath[]; prev: SkPath[]; gen: number }>(() => ({
    next,
    prev: next,
    gen: 0,
  }));
  if (shapes.next !== next) {
    const flat = streamPaths(
      layers.map((l) => ({ values: l.values.map(() => 0) })),
      width,
      height,
    );
    const prev = shapes.next.length === next.length && shapes.gen > 0 ? shapes.next : flat;
    setShapes({ next, prev, gen: shapes.gen + 1 });
  }
  const t = useSharedValue(1);
  useEffect(() => {
    if (shapes.gen === 0) return;
    if (reduced) {
      t.set(1);
      return;
    }
    t.set(0);
    t.set(withSpring(1, spring('smooth')));
  }, [shapes.gen, reduced, t]);

  const choose = (key: string | null) => {
    haptic('tick');
    setFocus((f) => (f === key ? null : key));
  };

  const tap = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const hit = next.findIndex((p) => p.contains(locationX, locationY));
    choose(hit >= 0 ? layers[hit]!.key : null);
  };

  const sums = layers.map((l) => l.values.reduce((a, b) => a + b, 0));
  const all = sums.reduce((a, b) => a + b, 0);
  const fi = layers.findIndex((l) => l.key === focus);
  const summary = layers.map((l, i) => `${l.label} ${formatValue(sums[i]!)}`).join(', ');

  return (
    <View testID={testID} style={[{ gap: space[3] }, style]}>
      <View style={styles.readout}>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
          {fi >= 0 ? layers[fi]!.label : 'All'}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size.xl,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatValue(fi >= 0 ? sums[fi]! : all)}
          {fi >= 0 && all > 0 ? (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.regular,
              }}
            >
              {`  ${Math.round((sums[fi]! / all) * 100)}%`}
            </Text>
          ) : null}
        </Text>
      </View>
      <Pressable
        onPress={tap}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}. ${summary}`}
        style={{ height }}
      >
        {width > 0 ? (
          <Canvas style={{ width, height }} pointerEvents="none">
            {shapes.next.map((p, i) => (
              <Layer
                key={layers[i]?.key ?? i}
                next={p}
                prev={shapes.prev[i] ?? p}
                t={t}
                color={tint(i)}
                dim={focus !== null && layers[i]?.key !== focus}
                reduced={reduced}
              />
            ))}
          </Canvas>
        ) : null}
      </Pressable>
      <View style={styles.legend}>
        {layers.map((l, i) => {
          const on = focus === l.key;
          return (
            <Pressable
              key={l.key}
              onPress={() => choose(l.key)}
              accessibilityRole="button"
              accessibilityLabel={`${l.label}, ${formatValue(sums[i]!)}`}
              accessibilityState={{ selected: on }}
              style={styles.key}
            >
              <View
                style={[
                  styles.keyInner,
                  {
                    borderRadius: radius.pill,
                    backgroundColor: on ? colors.surfaceRaised : undefined,
                    borderColor: on ? colors.borderStrong : 'transparent',
                  },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: tint(i) }]} />
                <Text
                  style={{ color: on ? colors.text : colors.textMuted, fontSize: font.size.sm }}
                >
                  {l.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type LayerProps = {
  next: SkPath;
  prev: SkPath;
  t: SharedValue<number>;
  color: string;
  dim: boolean;
  reduced: boolean;
};

function Layer({ next, prev, t, color, dim, reduced }: LayerProps) {
  const fade = useSharedValue(dim ? 0.18 : 1);
  useEffect(() => {
    fade.set(withTiming(dim ? 0.18 : 1, timing('base', reduced)));
  }, [dim, reduced, fade]);
  const path = useDerivedValue(() => {
    const p = t.get();
    if (p >= 1) return next;
    return next.interpolate(prev, Math.max(0, p)) ?? next;
  });
  const opacity = useDerivedValue(() => fade.get());
  return <Path path={path} color={color} opacity={opacity} />;
}

const styles = StyleSheet.create({
  readout: { gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 },
  key: { height: minTouchTarget, justifyContent: 'center' },
  keyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderWidth: 1,
  },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
