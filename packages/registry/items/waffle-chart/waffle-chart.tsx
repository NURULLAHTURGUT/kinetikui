import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type WaffleSlice = { label: string; value: number };

export type WaffleChartProps = {
  /** Shares in percent. They may add up to less than 100; the rest stays empty. */
  data: readonly WaffleSlice[];
  /** One colour per slice. Defaults to azure, sky, the theme ink and grey. */
  colors?: readonly string[];
  /** Show the legend under the grid. Defaults to true. */
  legend?: boolean;
  /** What the chart shows, read first, e.g. "Where the budget goes". */
  accessibilityLabel: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const GRID = 10;
const GAP = 3;
/** Largest diagonal index in a 10 × 10 grid. */
const DIAGONALS = GRID * 2 - 2;

/** Whole cells per slice that add up to the rounded total (largest remainder). */
export function waffleCells(values: readonly number[]): number[] {
  const clamped = values.map((v) => Math.max(0, v));
  const total = Math.min(100, Math.round(clamped.reduce((a, b) => a + b, 0)));
  const floors = clamped.map((v) => Math.floor(v));
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = clamped.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  // Never more than a hundred cells, whatever the input.
  let over = floors.reduce((a, b) => a + b, 0) - 100;
  for (let i = floors.length - 1; i >= 0 && over > 0; i--) {
    const cut = Math.min(over, floors[i]!);
    floors[i]! -= cut;
    over -= cut;
  }
  return floors;
}

/**
 * A ten-by-ten grid where every cell is one percent. The cells fill in as a
 * wave from one corner, new data washes across the grid the same way, and
 * tapping a slice in the legend dims everything else.
 */
export function WaffleChart({
  data,
  colors: palette,
  legend = true,
  accessibilityLabel,
  testID,
  style,
}: WaffleChartProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState(-1);
  const inks = palette ?? [colors.azure, colors.sky, colors.ember, colors.ice];

  const counts = useMemo(() => waffleCells(data.map((d) => d.value)), [data]);
  // Slice index for each of the hundred cells, or -1 for empty ones.
  const owners = useMemo(() => {
    const out: number[] = [];
    counts.forEach((n, i) => {
      for (let k = 0; k < n; k++) out.push(i);
    });
    while (out.length < GRID * GRID) out.push(-1);
    return out;
  }, [counts]);
  const cellColor = (owner: number) => (owner < 0 ? colors.track : inks[owner % inks.length]!);
  const target = owners.map(cellColor);

  // The colours before the latest change, so the cells can wash from old to new.
  const key = target.join('|');
  const [swap, setSwap] = useState({ key, from: target, to: target, wave: 0 });
  if (swap.key !== key) {
    setSwap({ key, from: swap.to, to: target, wave: swap.wave + 1 });
  }
  const from = swap.from;

  const enter = useSharedValue(reduced ? 1 : 0);
  const wash = useSharedValue(1);
  const focused = useSharedValue(-1);

  useEffect(() => {
    enter.set(
      reduced ? 1 : withTiming(1, { duration: durations.slow * 2, easing: easings.standard }),
    );
  }, [reduced, enter]);
  useEffect(() => {
    if (swap.wave === 0) return;
    wash.set(0);
    wash.set(
      reduced ? 1 : withTiming(1, { duration: durations.slow * 2.2, easing: easings.standard }),
    );
  }, [swap.wave, reduced, wash]);
  useEffect(() => {
    focused.set(focus);
  }, [focus, focused]);

  // Rounded down a little, so ten cells always fit on a row whatever the pixel rounding.
  const cell = width > 0 ? Math.floor(((width - GAP * (GRID - 1)) / GRID) * 10) / 10 : 0;
  const summary = data.map((d) => `${d.label} ${Math.round(d.value)}%`).join(', ');

  return (
    <View testID={testID} style={[{ gap: 16 }, style]}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${accessibilityLabel}: ${summary}`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.grid, { gap: GAP }]}
      >
        {cell > 0
          ? owners.map((owner, i) => (
              <Cell
                key={i}
                size={cell}
                order={Math.floor(i / GRID) + (i % GRID)}
                owner={owner}
                from={from[i] ?? target[i]!}
                to={target[i]!}
                enter={enter}
                wash={wash}
                focused={focused}
                radius={Math.min(radius.xs, cell / 4)}
              />
            ))
          : null}
      </View>
      {legend ? (
        <View style={styles.legend}>
          {data.map((d, i) => (
            <Pressable
              key={d.label}
              onPress={() => setFocus((f) => (f === i ? -1 : i))}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}, ${Math.round(d.value)}%`}
              accessibilityState={{ selected: focus === i }}
              style={[styles.item, { opacity: focus === -1 || focus === i ? 1 : 0.4 }]}
            >
              <View
                style={[styles.swatch, { backgroundColor: inks[i % inks.length], borderRadius: 3 }]}
              />
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{d.label}</Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {Math.round(d.value)}%
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type CellProps = {
  size: number;
  order: number;
  owner: number;
  from: string;
  to: string;
  enter: SharedValue<number>;
  wash: SharedValue<number>;
  focused: SharedValue<number>;
  radius: number;
};

function Cell({ size, order, owner, from, to, enter, wash, focused, radius }: CellProps) {
  const style = useAnimatedStyle(() => {
    // Each diagonal starts a moment after the one before it.
    const delay = (order / DIAGONALS) * 0.55;
    const e = Math.max(0, Math.min(1, (enter.get() - delay) / 0.45));
    const w = Math.max(0, Math.min(1, (wash.get() - delay) / 0.45));
    const f = focused.get();
    return {
      backgroundColor: interpolateColor(w, [0, 1], [from, to]),
      opacity: e * (f < 0 || f === owner ? 1 : 0.22),
      transform: [{ scale: 0.4 + e * 0.6 - Math.sin(w * Math.PI) * 0.12 }],
    };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: radius }, style]} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', aspectRatio: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  swatch: { width: 10, height: 10 },
});
