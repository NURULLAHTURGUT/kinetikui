import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type UsageSegment = { label: string; value: number };

export type UsageMeterProps = {
  /** What fills the allowance, in the same unit as `total`. */
  segments: readonly UsageSegment[];
  /** The allowance, e.g. 200 for 200 GB. */
  total: number;
  /** Unit after figures, e.g. "GB". */
  unit?: string;
  /** Formats figures. Defaults to one decimal place below 10, whole numbers above. */
  formatValue?: (value: number) => string;
  /** Share of the allowance at which the remainder turns amber. Defaults to 0.85. */
  warnAt?: number;
  /** One colour per segment. Defaults to azure, sky, the theme ink and grey. */
  colors?: readonly string[];
  /** Show the legend. Defaults to true. */
  legend?: boolean;
  /** What is measured, e.g. "Storage". Shown as the heading and read first. */
  title: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const BAR = 12;
const SEAM = 2;

const defaultFormat = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : String(Math.round(v)));

/**
 * What fills an allowance. The segments grow into the bar one after another
 * while the figure counts up, and the space left turns amber, then red, as
 * the limit gets close.
 */
export function UsageMeter({
  segments,
  total,
  unit,
  formatValue = defaultFormat,
  warnAt = 0.85,
  colors: palette,
  legend = true,
  title,
  testID,
  style,
}: UsageMeterProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const inks = palette ?? [colors.azure, colors.sky, colors.ember, colors.ice];

  const used = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const share = total > 0 ? used / total : 0;
  const left = total - used;
  const state = share >= 1 ? 'over' : share >= warnAt ? 'warn' : 'ok';
  const shown = useCountUp(used, { instant: reduced, duration: 1000 });
  const u = unit ? ` ${unit}` : '';

  // Each segment's start and width as shares of the allowance, cut off at the end of the bar.
  let start = 0;
  const parts = segments.map((s) => {
    const from = Math.min(1, start / (total || 1));
    start += Math.max(0, s.value);
    const to = Math.min(1, start / (total || 1));
    return { from, to };
  });

  const leftColor =
    state === 'over' ? colors.danger : state === 'warn' ? colors.warning : colors.textMuted;
  const leftText =
    state === 'over' ? `${formatValue(-left)}${u} over` : `${formatValue(left)}${u} left`;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityValue={{
        min: 0,
        max: total,
        now: Math.min(used, total),
        text: `${formatValue(used)} of ${formatValue(total)}${u} used, ${leftText}. ${segments
          .map((s) => `${s.label} ${formatValue(s.value)}${u}`)
          .join(', ')}`,
      }}
      style={[{ gap: space[3] }, style]}
    >
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{title}</Text>
          <Text
            style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.semibold }}
          >
            <Text style={{ fontVariant: ['tabular-nums'] }}>{formatValue(shown)}</Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.md,
                fontWeight: font.weight.regular,
              }}
            >
              {` of ${formatValue(total)}${u}`}
            </Text>
          </Text>
        </View>
        <Text
          style={{ color: leftColor, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          {leftText}
        </Text>
      </View>

      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.track, borderRadius: radius.pill }]}
      >
        {width > 0
          ? parts.map((p, i) => (
              <Segment
                key={segments[i]!.label}
                index={i}
                from={p.from}
                to={p.to}
                width={width}
                color={inks[i % inks.length]!}
                reduced={reduced}
              />
            ))
          : null}
      </View>

      {legend ? (
        <View style={styles.legend}>
          {segments.map((s, i) => (
            <View key={s.label} style={styles.item}>
              <View style={[styles.swatch, { backgroundColor: inks[i % inks.length] }]} />
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{s.label}</Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.medium,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatValue(s.value)}
                {u}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type SegmentProps = {
  index: number;
  from: number;
  to: number;
  width: number;
  color: string;
  reduced: boolean;
};

function Segment({ index, from, to, width, color, reduced }: SegmentProps) {
  const a = useSharedValue(reduced ? from : 0);
  const b = useSharedValue(reduced ? to : 0);
  useEffect(() => {
    // Later segments follow the earlier ones in, so the bar fills from the left.
    const wait = reduced ? 0 : index * 110;
    a.set(withDelay(wait, withSpring(from, spring('smooth', reduced))));
    b.set(withDelay(wait, withSpring(to, spring('smooth', reduced))));
  }, [from, to, index, reduced, a, b]);
  return <Bar a={a} b={b} width={width} color={color} first={index === 0} />;
}

function Bar({
  a,
  b,
  width,
  color,
  first,
}: {
  a: SharedValue<number>;
  b: SharedValue<number>;
  width: number;
  color: string;
  first: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const x = a.get() * width + (first ? 0 : SEAM / 2);
    const w = Math.max(0, (b.get() - a.get()) * width - (first ? SEAM / 2 : SEAM));
    return { left: x, width: w, opacity: w > 0.5 ? 1 : 0 };
  });
  return <Animated.View style={[styles.segment, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  bar: { height: BAR, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0, borderRadius: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
});
