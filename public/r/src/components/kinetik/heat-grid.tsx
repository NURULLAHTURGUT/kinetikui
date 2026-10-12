import { Canvas, Path, RoundedRect, Skia, type SkPath } from '@shopify/react-native-skia';
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
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type HeatGridProps = {
  /** One value per cell, oldest first, filling each column top to bottom. */
  data: readonly number[];
  /** Cells per column. Defaults to 7, a week. */
  rows?: number;
  /** Labels down the left, one per row; empty strings leave a row unlabelled. */
  rowLabels?: readonly string[];
  /** Describes one cell for the readout and screen readers, e.g. "Tue 14 Oct · 3 rides". */
  describe?: (index: number, value: number) => string;
  /** The readout while nothing is selected. Defaults to the total. */
  summary?: string;
  /** Colour of the busiest cells. Defaults to the theme azure. */
  color?: string;
  /** Space between cells. Defaults to 3. */
  gap?: number;
  /** Called with the cell under the finger, or null when the selection clears. */
  onSelect?: (index: number | null) => void;
  /** A tick as the finger moves from cell to cell. Defaults to true. */
  haptics?: boolean;
  /** What the grid shows, e.g. "Rides, last 20 weeks". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Shades of the colour for levels 1–4; level 0 is the empty track. */
const SHADES = [0.26, 0.48, 0.72, 1];
const LABEL_W = 30;

type Cell = { x: number; y: number; delay: number };

/**
 * A calendar grid of days shaded by how much happened on each. The cells pop
 * in as a diagonal wave; drag across the grid to read any day.
 */
export function HeatGrid({
  data,
  rows = 7,
  rowLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''],
  describe = (i, v) => `Day ${i + 1}: ${v}`,
  summary,
  color,
  gap = 3,
  onSelect,
  haptics = true,
  accessibilityLabel,
  style,
}: HeatGridProps) {
  const { colors, font, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const ink = color ?? colors.azure;

  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const n = data.length;
  const cols = Math.max(1, Math.ceil(n / rows));
  const labelled = rowLabels.some(Boolean);
  const left = labelled ? LABEL_W : 0;
  const cell = Math.max(6, Math.min(22, Math.floor((width - left - gap * (cols - 1)) / cols)));
  const pitch = cell + gap;
  const height = rows * cell + (rows - 1) * gap;

  // Keyed on the values, not the array: a new array with the same numbers must not replay.
  const signature = data.join(',');
  const levels = useMemo(() => {
    const max = Math.max(0, ...data);
    const out: Cell[][] = [[], [], [], [], []];
    if (width === 0) return out;
    data.forEach((v, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const level = v <= 0 || max === 0 ? 0 : 1 + Math.min(3, Math.floor((v / max) * 4 - 1e-9));
      out[level]!.push({
        x: left + col * pitch,
        y: row * pitch,
        // A diagonal wave from the top-left corner.
        delay: ((col + row * 0.7) / (cols + rows * 0.7)) * 0.62,
      });
    });
    return out;
    // `signature` stands in for `data`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, rows, cols, left, pitch, width]);

  const total = data.reduce((s, v) => s + Math.max(0, v), 0);

  const sized = width > 0;
  const clock = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!sized) return;
    if (reduced) {
      clock.set(1);
      return;
    }
    clock.set(0);
    clock.set(withTiming(1, { duration: 1200, easing: Easing.linear }));
    // Replays when the data changes or the grid first gets its size.
  }, [signature, sized, reduced, clock]);

  const choose = (i: number | null) => {
    setSelected(i);
    if (i !== null) haptic('tick');
    onSelect?.(i);
  };
  const hover = useSharedValue(-1);
  const move = (x: number, y: number, clear: boolean) => {
    'worklet';
    const col = Math.floor((x - left + gap / 2) / pitch);
    const row = Math.floor((y + gap / 2) / pitch);
    const i = col * rows + row;
    const valid = col >= 0 && col < cols && row >= 0 && row < rows && i < n;
    if (!valid) return;
    // A tap on the selected cell clears it; a drag only ever selects.
    const next = clear && i === hover.get() ? -1 : i;
    if (next === hover.get()) return;
    hover.set(next);
    scheduleOnRN(choose, next < 0 ? null : next);
  };

  const pan = Gesture.Pan()
    .withTestId('heat-grid')
    .minDistance(0)
    .onBegin((e) => {
      move(e.x, e.y, true);
    })
    .onUpdate((e) => {
      move(e.x, e.y, false);
    });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (n === 0) return;
    const at = current ?? n - 1;
    const next =
      e.nativeEvent.actionName === 'increment' ? Math.min(n - 1, at + 1) : Math.max(0, at - 1);
    hover.set(next);
    choose(next);
  };

  // A selection past the end of new, shorter data no longer exists.
  const current = selected !== null && selected < n ? selected : null;
  const readout =
    current === null ? (summary ?? `${total} in total`) : describe(current, data[current]!);
  const sel =
    current === null
      ? null
      : { x: left + Math.floor(current / rows) * pitch, y: (current % rows) * pitch };
  const fills = [colors.track, ...SHADES.map((a) => withAlpha(ink, a))];
  const corner = Math.max(2, cell * 0.24);

  return (
    <View style={[{ gap: space[3] }, style]}>
      <Text
        style={{
          color: current === null ? colors.textMuted : colors.text,
          fontSize: font.size.sm,
          fontWeight: current === null ? font.weight.regular : font.weight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {readout}
      </Text>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ text: readout }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          // Until it is measured, a rough height keeps the layout from jumping.
          style={{ height: width > 0 ? height : rows * 14 }}
        >
          {labelled ? (
            <View pointerEvents="none" style={[styles.labels, { width: left }]}>
              {Array.from({ length: rows }, (_, r) => (
                <Text
                  key={r}
                  style={[
                    styles.label,
                    { top: r * pitch, height: cell, lineHeight: cell, color: colors.textSubtle },
                  ]}
                >
                  {rowLabels[r] ?? ''}
                </Text>
              ))}
            </View>
          ) : null}
          {/* Wrapped so touches reach the gesture on the web, where the canvas ignores pointerEvents. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              {levels.map((cells, level) => (
                <Level
                  key={level}
                  cells={cells}
                  size={cell}
                  corner={corner}
                  clock={clock}
                  color={fills[level]!}
                />
              ))}
              {sel ? (
                <RoundedRect
                  x={sel.x - 1.5}
                  y={sel.y - 1.5}
                  width={cell + 3}
                  height={cell + 3}
                  r={corner + 1.5}
                  style="stroke"
                  strokeWidth={1.5}
                  color={colors.text}
                />
              ) : null}
            </Canvas>
          </View>
        </View>
      </GestureDetector>
      <View style={[styles.key, { paddingLeft: left }]}>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>Less</Text>
        {fills.map((f, i) => (
          <View key={i} style={{ width: 10, height: 10, borderRadius: 2.5, backgroundColor: f }} />
        ))}
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>More</Text>
      </View>
    </View>
  );
}

/** Every cell of one shade, as one path, grown in by the shared clock. */
function Level({
  cells,
  size,
  corner,
  clock,
  color,
}: {
  cells: Cell[];
  size: number;
  corner: number;
  clock: SharedValue<number>;
  color: string;
}) {
  const path = useDerivedValue<SkPath>(() => {
    const t = clock.get();
    const b = Skia.PathBuilder.Make();
    for (const c of cells) {
      const local = Math.max(0, Math.min(1, (t - c.delay) / 0.38));
      if (local <= 0) continue;
      // Ease out with a touch of overshoot, so each cell pops.
      const k = local - 1;
      const grow = 1 + 2.2 * k * k * k + 1.2 * k * k;
      const s = size * Math.max(0, grow);
      const o = (size - s) / 2;
      b.addRRect(Skia.RRectXY(Skia.XYWHRect(c.x + o, c.y + o, s, s), corner, corner));
    }
    return b.detach();
  });
  return <Path path={path} color={color} />;
}

const styles = StyleSheet.create({
  labels: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { position: 'absolute', left: 0, fontSize: 10 },
  key: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
});
