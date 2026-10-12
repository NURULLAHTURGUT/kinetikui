import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type DonutSlice = { label: string; value: number; color?: string };

export type DonutChartProps = {
  data: readonly DonutSlice[];
  /** Diameter of the ring. Defaults to 200. */
  size?: number;
  /** Ring thickness. Defaults to 18. */
  thickness?: number;
  /** Gap between slices, in degrees. Defaults to 6. */
  gap?: number;
  /** Shown in the middle under the total. Defaults to 'Total'. */
  centerLabel?: string;
  formatValue?: (value: number) => string;
  /** Called with the selected slice, or null when the selection clears. */
  onSelect?: (index: number | null) => void;
  /** A list of slices under the ring. Defaults to true. */
  legend?: boolean;
  /** A tick when a slice is selected. Defaults to true. */
  haptics?: boolean;
  /** A summary of what the chart shows, e.g. "Spending by category". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Extra width a selected slice grows by. */
const LIFT = 7;

/**
 * A ring of rounded slices that sweeps in around the clock. Tap a slice, or
 * its row in the legend, to bring it forward: it thickens, the others step
 * back, and the centre shows its share.
 */
export function DonutChart({
  data,
  size = 200,
  thickness = 18,
  gap = 6,
  centerLabel = 'Total',
  formatValue = (v) => String(v),
  onSelect,
  legend = true,
  haptics = true,
  accessibilityLabel,
  style,
}: DonutChartProps) {
  const { colors, font, space, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [selected, setSelected] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const ringR = size / 2 - thickness / 2 - LIFT / 2 - 1;
  // A monochrome ramp by default: the strongest ink, stepping back.
  const ramp = [1, 0.62, 0.38, 0.22, 0.12];
  const tint = (d: DonutSlice, i: number) =>
    d.color ?? withAlpha(colors.ember, ramp[i % ramp.length]!);

  // Keyed on the values, not the array: a new array with the same slices must not sweep again.
  const signature = data.map((d) => `${d.label}:${d.value}`).join('|');
  const slices = useMemo(() => {
    // Round caps reach past the arc's ends; take them out of the sweep so the gaps stay even.
    const cap = (thickness / 2 / ringR) * (180 / Math.PI);
    const shares = data.map((d) => (total > 0 ? Math.max(0, d.value) / total : 0));
    return shares.map((share, i) => {
      const from = shares.slice(0, i).reduce((sum, s) => sum + s, 0);
      const at = from + share;
      const sweep = Math.max(0.5, share * 360 - gap - cap * 2);
      const path = Skia.PathBuilder.Make()
        .addArc(
          { x: size / 2 - ringR, y: size / 2 - ringR, width: ringR * 2, height: ringR * 2 },
          -90 + from * 360 + gap / 2 + cap,
          sweep,
        )
        .detach();
      return { path, from, to: at, share };
    });
    // `signature` stands in for `data`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, total, size, ringR, thickness, gap]);

  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: 1100, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [slices, reduced, progress]);

  const choose = (i: number | null) => {
    const next = i === selected ? null : i;
    setSelected(next);
    if (next !== null) haptic('tick');
    onSelect?.(next);
  };

  // Tap the ring to pick the slice under the finger; tap the middle to clear.
  const tap = Gesture.Tap()
    .withTestId('donut-chart')
    .onEnd((e, ok) => {
      if (!ok) return;
      const dx = e.x - size / 2;
      const dy = e.y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ringR - thickness) {
        scheduleOnRN(choose, null);
        return;
      }
      if (dist > ringR + thickness) return;
      const turn = (((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360) / 360;
      const i = slices.findIndex((s) => turn >= s.from && turn < s.to);
      if (i >= 0) scheduleOnRN(choose, i);
    });

  const focus = selected === null ? null : data[selected];
  const centerValue = focus ? formatValue(focus.value) : formatValue(total);
  const centerCaption = focus
    ? `${focus.label} · ${Math.round((Math.max(0, focus.value) / (total || 1)) * 100)}%`
    : centerLabel;

  return (
    <View style={[{ gap: space[5] }, style]}>
      <GestureDetector gesture={tap}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${accessibilityLabel}. ${data
            .map((d) => `${d.label} ${formatValue(d.value)}`)
            .join(', ')}`}
          style={[styles.ring, { width: size, height: size }]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              {slices.map((s, i) => (
                <Slice
                  key={i}
                  path={s.path}
                  from={s.from}
                  to={s.to}
                  color={tint(data[i]!, i)}
                  thickness={thickness}
                  progress={progress}
                  state={selected === null ? 'rest' : selected === i ? 'focus' : 'back'}
                  reduced={reduced}
                />
              ))}
            </Canvas>
          </View>
          <View pointerEvents="none" style={styles.center}>
            <Center
              value={centerValue}
              caption={centerCaption}
              big={Math.round(size * 0.15)}
              reduced={reduced}
            />
          </View>
        </View>
      </GestureDetector>

      {legend ? (
        <View style={{ gap: 2 }}>
          {data.map((d, i) => {
            const on = selected === i;
            return (
              <Pressable
                key={`${d.label}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}, ${formatValue(d.value)}`}
                accessibilityState={{ selected: on }}
                onPress={() => choose(i)}
                style={[
                  styles.row,
                  {
                    borderRadius: radius.md,
                    backgroundColor: on ? colors.surfaceRaised : 'transparent',
                    paddingHorizontal: space[3],
                    opacity: selected === null || on ? 1 : 0.5,
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: tint(d, i) }]} />
                <Text style={{ flex: 1, color: colors.text, fontSize: font.size.sm }}>
                  {d.label}
                </Text>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: font.size.sm,
                    fontVariant: ['tabular-nums'],
                    marginRight: space[3],
                  }}
                >
                  {Math.round((Math.max(0, d.value) / (total || 1)) * 100)}%
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.semibold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatValue(d.value)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Slice({
  path,
  from,
  to,
  color,
  thickness,
  progress,
  state,
  reduced,
}: {
  path: SkPath;
  from: number;
  to: number;
  color: string;
  thickness: number;
  progress: SharedValue<number>;
  state: 'rest' | 'focus' | 'back';
  reduced: boolean;
}) {
  const width = useSharedValue(thickness);
  const fade = useSharedValue(1);
  useEffect(() => {
    width.set(
      withSpring(state === 'focus' ? thickness + LIFT : thickness, spring('bouncy', reduced)),
    );
    fade.set(withTiming(state === 'back' ? 0.3 : 1, timing('base', reduced)));
  }, [state, thickness, reduced, width, fade]);

  // Each slice draws during its own share of the sweep.
  const end = useDerivedValue(() =>
    Math.max(0, Math.min(1, (progress.get() - from) / Math.max(0.0001, to - from))),
  );

  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={width}
      strokeCap="round"
      color={color}
      opacity={fade}
      end={end}
    />
  );
}

/** The middle: the figure and its caption, rising in whenever they change. */
function Center({
  value,
  caption,
  big,
  reduced,
}: {
  value: string;
  caption: string;
  big: number;
  reduced: boolean;
}) {
  const { colors, font } = useKinetikTheme();
  const t = useSharedValue(1);
  useEffect(() => {
    t.set(0);
    t.set(withTiming(1, timing('base', reduced)));
  }, [value, caption, reduced, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 6 }],
  }));
  return (
    <Animated.View style={[styles.centerInner, style]}>
      <Text
        style={{
          color: colors.text,
          fontSize: big,
          fontWeight: font.weight.bold,
          letterSpacing: -0.8,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 }}
      >
        {caption}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  centerInner: { alignItems: 'center', maxWidth: '62%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: minTouchTarget },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
