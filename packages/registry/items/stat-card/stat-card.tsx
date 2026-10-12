import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Skia,
  rect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

export type StatCardProps = {
  /** What the figure is, e.g. "Visitors". */
  label: string;
  value: number;
  /** Formats the figure as it counts. Defaults to grouped whole numbers. */
  formatValue?: (value: number) => string;
  /** Change against the previous period as a fraction: 0.124 for +12.4%. */
  delta?: number;
  /** Lower is better, e.g. for a bounce rate: a fall shows as good news. */
  invertDelta?: boolean;
  /** Under the figure, e.g. "vs last week". */
  caption?: string;
  /** Recent values, oldest first, drawn as a sparkline along the bottom. */
  trend?: readonly number[];
  /** An icon before the label. */
  icon?: ReactNode;
  /** Sparkline colour. Defaults to the theme azure. */
  color?: string;
  /** Makes the card a button. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const SPARK_H = 56;

const grouped = (v: number) => Math.round(v).toLocaleString('en-US');
const percent = (f: number) => `${Math.abs(f * 100).toFixed(1)}%`;

/**
 * A key figure with its context: the number counts up to its value, a pill
 * shows the change in green or red, and a sparkline draws itself in along
 * the bottom of the card.
 */
export function StatCard({
  label,
  value,
  formatValue = grouped,
  delta,
  invertDelta = false,
  caption,
  trend,
  icon,
  color,
  onPress,
  style,
}: StatCardProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const ink = color ?? colors.azure;
  const [width, setWidth] = useState(0);

  const shown = useCountUp(value, { instant: reduced, duration: 1200 });
  const up = (delta ?? 0) >= 0;
  const good = up !== invertDelta;
  const tone =
    delta === undefined || delta === 0 ? colors.textMuted : good ? colors.success : colors.danger;

  // Keyed on the values, not the array: a new array with the same numbers must not redraw.
  const signature = trend?.join(',') ?? '';
  const spark = useMemo(() => {
    if (!trend || trend.length < 2 || width === 0) return null;
    const lo = Math.min(...trend);
    const hi = Math.max(...trend);
    const span = hi - lo || 1;
    // Bleeds off the left edge; stops short of the right so the end dot fits.
    const reach = width - 10;
    const pts = trend.map((v, i) => ({
      x: (i / (trend.length - 1)) * reach,
      y: 6 + (1 - (v - lo) / span) * (SPARK_H - 12),
    }));
    // Straight segments with rounded joins read cleaner than a curve at this size.
    const line = Skia.PathBuilder.Make();
    pts.forEach((p, i) => (i === 0 ? line.moveTo(p.x, p.y) : line.lineTo(p.x, p.y)));
    const area = Skia.PathBuilder.MakeFromPath(line.build())
      .lineTo(reach, SPARK_H)
      .lineTo(0, SPARK_H)
      .close()
      .detach();
    return { line: line.detach(), area, last: pts[pts.length - 1]! };
    // `signature` stands in for `trend`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, width]);

  const draw = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!spark) return;
    if (reduced) {
      draw.set(1);
      return;
    }
    draw.set(0);
    draw.set(withTiming(1, { duration: 1200, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [spark, reduced, draw]);
  const reveal = useDerivedValue(() => rect(0, 0, width * draw.get(), SPARK_H));
  const dot = useDerivedValue(() => (draw.get() > 0.98 ? 1 : 0));

  const pressed = useSharedValue(0);
  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.02 }] }));

  const deltaText = delta === undefined ? null : `${up ? 'up' : 'down'} ${percent(delta)}`;
  const name = [label, formatValue(value), deltaText, caption].filter(Boolean).join(', ');

  const body = (
    <>
      <View style={[styles.head, { paddingHorizontal: space[5], paddingTop: space[5] }]}>
        {icon}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.textMuted,
            fontSize: font.size.sm,
            fontWeight: font.weight.medium,
          }}
        >
          {label}
        </Text>
        {delta !== undefined ? (
          <View
            style={[
              styles.pill,
              { backgroundColor: withAlpha(tone, 0.14), borderRadius: radius.pill },
            ]}
          >
            <View style={[styles.arrow, { borderColor: tone }, !up && styles.arrowDown]} />
            <Text
              style={{
                color: tone,
                fontSize: font.size.xs,
                fontWeight: font.weight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {percent(delta)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: space[5], paddingTop: space[2], gap: 2 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.bold,
            letterSpacing: -1.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatValue(shown)}
        </Text>
        {caption ? (
          <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>{caption}</Text>
        ) : null}
      </View>
      {trend ? (
        <View
          pointerEvents="none"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[styles.spark, { marginTop: space[3] }]}
        >
          {spark ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Group clip={reveal}>
                <Path path={spark.area}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, SPARK_H)}
                    colors={[withAlpha(ink, 0.28), withAlpha(ink, 0)]}
                  />
                </Path>
                <Path
                  path={spark.line}
                  style="stroke"
                  strokeWidth={2}
                  strokeJoin="round"
                  strokeCap="round"
                  color={ink}
                />
              </Group>
              <Group opacity={dot}>
                <Circle c={vec(spark.last.x, spark.last.y)} r={4.5} color={colors.surface} />
                <Circle c={vec(spark.last.x, spark.last.y)} r={3} color={ink} />
              </Group>
            </Canvas>
          ) : null}
        </View>
      ) : (
        <View style={{ height: space[5] }} />
      )}
    </>
  );

  const frame = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
  ];

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={name} style={[frame, style]}>
        {body}
      </View>
    );
  }
  return (
    <Animated.View style={[shell, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
        onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
        accessibilityRole="button"
        accessibilityLabel={name}
        style={frame}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  // A chevron made of two borders of a square, pointing up.
  arrow: {
    width: 6,
    height: 6,
    borderLeftWidth: 1.6,
    borderTopWidth: 1.6,
    transform: [{ translateY: 1.5 }, { rotate: '45deg' }],
  },
  arrowDown: { transform: [{ translateY: -1.5 }, { rotate: '225deg' }] },
  spark: { height: SPARK_H },
});
