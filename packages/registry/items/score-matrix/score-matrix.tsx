import { BlurMask, Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextProps,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { palettes, withAlpha } from '../../shared/tokens/tokens';

export type MatrixMetric = {
  label: string;
  value: number;
  /** Small text after the value, e.g. "lbs". */
  unit?: string;
  /** Drawn inside the coloured disc. */
  icon?: ReactNode;
  /** Colour of the disc behind the icon. */
  tone: string;
};

export type ScoreMatrixProps = {
  /** Small caps label above the score. */
  label: string;
  score: number;
  /** Top of the scale. Defaults to 100. */
  max?: number;
  metrics: readonly MatrixMetric[];
  /** Colour of the lit dots. Defaults to a signal yellow. */
  accent?: string;
  /** Dot grid size. Defaults to 12 × 8. */
  columns?: number;
  rows?: number;
  style?: StyleProp<ViewStyle>;
};

/** Largest gap between dot centres; narrower cards shrink the grid to fit. */
const STEP = 13;
const DOT = 2.7;

/** Dot centres: the bottom row first, left to right, then upwards. */
function dotAt(i: number, columns: number, rows: number, step: number) {
  const col = i % columns;
  const row = rows - 1 - Math.floor(i / columns);
  return { x: col * step + step / 2, y: row * step + step / 2 };
}

const DISPLAY = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-light',
  default: 'system-ui, sans-serif',
});

/**
 * A dark score card: the big figure counts up while a grid of dots lights
 * from the bottom-left, one dot at a time, up to the score's share of the
 * scale. Beside it, rows of metrics slide in with their values counting.
 */
export function ScoreMatrix({
  label,
  score,
  max = 100,
  metrics,
  accent = 'hsl(62, 96%, 58%)',
  columns = 12,
  rows = 8,
  style,
}: ScoreMatrixProps) {
  const { radius, space, font, shadow } = useKinetikTheme();
  // A dark slab on either theme, so the lit dots glow.
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  // The score column's width sets the dot grid's size.
  const [side, setSide] = useState(0);
  const step = side > 0 ? Math.min(STEP, side / columns) : 0;
  const dot = DOT * (step / STEP);
  const total = columns * rows;
  const lit = Math.round(Math.max(0, Math.min(1, score / max)) * total);

  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [lit, reduced, progress]);

  const dim = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let i = 0; i < columns * rows; i++) {
      const p = dotAt(i, columns, rows, step);
      b.addCircle(p.x, p.y, dot);
    }
    return b.detach();
  }, [columns, rows, step, dot]);
  const points = useMemo(
    () => Array.from({ length: lit }, (_, i) => dotAt(i, columns, rows, step)),
    [lit, columns, rows, step],
  );
  const bright = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const n = Math.round(progress.get() * points.length);
    for (let i = 0; i < n; i++) b.addCircle(points[i]!.x, points[i]!.y, dot + 0.3);
    return b.detach();
  });
  // The glow is blurred from the finished dots and fades in as they light: blurring a
  // path that changes every frame would cache a new blurred mask per frame.
  const halo = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (const p of points) b.addCircle(p.x, p.y, dot + 0.3);
    return b.detach();
  }, [points, dot]);
  const haloOn = useDerivedValue(() => progress.get() * 0.85);

  const grid = step > 0 && (
    <Canvas
      style={{ width: columns * step, height: rows * step, marginTop: space[4] }}
      pointerEvents="none"
    >
      <Path path={dim} color={withAlpha(colors.text, 0.1)} />
      <Group opacity={haloOn}>
        <Path path={halo} color={accent}>
          <BlurMask blur={4} style="normal" />
        </Path>
      </Group>
      <Path path={bright} color={accent} />
    </Canvas>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl + 4,
          padding: space[5],
          gap: space[5],
          boxShadow: shadow.lg,
        },
        style,
      ]}
    >
      <View
        accessible
        accessibilityLabel={`${label}: ${score} out of ${max}`}
        onLayout={(e) => setSide(e.nativeEvent.layout.width)}
        style={styles.side}
      >
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: font.size.xs + 1,
            fontWeight: font.weight.semibold,
            letterSpacing: 1.6,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Counted
          value={score}
          duration={1100}
          format={(n) => String(Math.round(n))}
          style={{
            color: colors.text,
            fontFamily: DISPLAY,
            fontSize: side > 0 ? Math.min(76, side * 0.55) : 76,
            lineHeight: side > 0 ? Math.min(84, side * 0.62) : 84,
            fontWeight: '300',
            letterSpacing: -3,
            fontVariant: ['tabular-nums'],
          }}
        />
        {grid}
      </View>
      <View style={styles.list}>
        {metrics.map((m, i) => (
          <Row key={m.label} metric={m} order={i} last={i === metrics.length - 1} />
        ))}
      </View>
    </View>
  );
}

function Row({ metric, order, last }: { metric: MatrixMetric; order: number; last: boolean }) {
  const { font } = useKinetikTheme();
  const colors = palettes.dark;
  const reduced = useReduceMotion();
  const shown = useCountUp(metric.value, { instant: reduced, duration: 900 + order * 120 });
  const enter = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) enter.set(withDelay(150 + order * 90, withSpring(1, spring('smooth'))));
  }, [order, reduced, enter]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateX: (1 - enter.get()) * 18 }],
  }));
  const whole = Number.isInteger(metric.value);
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${metric.label}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`}
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
        style,
      ]}
    >
      <View style={[styles.disc, { backgroundColor: metric.tone }]}>{metric.icon}</View>
      <Text
        numberOfLines={1}
        style={[
          styles.grow,
          {
            color: colors.text,
            fontSize: font.size.sm,
            fontWeight: font.weight.semibold,
            letterSpacing: 1.4,
          },
        ]}
      >
        {metric.label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontFamily: DISPLAY,
          fontSize: font.size.xl + 2,
          fontWeight: '300',
          fontVariant: ['tabular-nums'],
        }}
      >
        {whole ? Math.round(shown) : shown.toFixed(1)}
        {metric.unit ? (
          <Text style={{ fontSize: font.size.sm, color: colors.textMuted }}> {metric.unit}</Text>
        ) : null}
      </Text>
    </Animated.View>
  );
}

/** A figure counting up, in its own component so each count re-renders only this text. */
function Counted({
  value,
  duration,
  format,
  ...text
}: TextProps & { value: number; duration: number; format: (n: number) => string }) {
  const reduced = useReduceMotion();
  const shown = useCountUp(value, { instant: reduced, duration });
  return <Text {...text}>{format(shown)}</Text>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth },
  side: { width: '38%' },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60 },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
});
