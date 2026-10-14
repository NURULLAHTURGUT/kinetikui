import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type ExpenseRow = { label: string; value: number };

export type ExpenseCardProps<P extends string> = {
  title?: string;
  /** Icon before the title. */
  icon?: ReactNode;
  /** The rows for the current period. Values of 0 show an empty marker. */
  rows: readonly ExpenseRow[];
  /** Periods offered in the menu, e.g. ["Weekly", "Monthly", "Yearly"]. */
  periods?: readonly P[];
  period?: P;
  onPeriodChange?: (period: P) => void;
  /** Top of the scale. Defaults to the largest value rounded up to a tidy number. */
  max?: number;
  /** Formats axis labels and values. Defaults to 2K, 10K style. */
  formatValue?: (value: number) => string;
  /** Bar colour. Defaults to the theme azure. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const LABEL = 76;
const BAR = 20;
const STEPS = 5;

const compact = (n: number) =>
  n >= 1000 ? `${Math.round((n / 1000) * 10) / 10}K`.replace('.0K', 'K') : String(Math.round(n));

/** The smallest of 1, 2, 2.5 or 5 times a power of ten that is at least `n`. */
export function niceMax(n: number): number {
  if (n <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

/**
 * A spending card: a period menu in the header and horizontal bars on a
 * dashed grid. Bars grow in one after another, regrow when the period
 * changes, and an empty category shows a quiet placeholder square.
 */
export function ExpenseCard<P extends string>({
  title = 'Major Expenses',
  icon,
  rows,
  periods,
  period,
  onPeriodChange,
  max,
  formatValue = compact,
  color,
  style,
}: ExpenseCardProps<P>) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [plot, setPlot] = useState(0);
  const [open, setOpen] = useState(false);
  const top = max ?? niceMax(Math.max(0, ...rows.map((r) => r.value)));
  const fill = color ?? colors.azure;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderRadius: radius.xl,
          boxShadow: shadow.md,
        },
        style,
      ]}
    >
      <View style={[styles.head, { padding: space[5], paddingBottom: space[4], gap: space[3] }]}>
        {icon}
        <Text
          accessibilityRole="header"
          style={[
            styles.grow,
            { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.medium },
          ]}
        >
          {title}
        </Text>
        {periods && period ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Period: ${period}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            style={[
              styles.select,
              { borderColor: colors.borderStrong, borderRadius: radius.md, gap: 6 },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: font.size.md }}>{period}</Text>
            <View
              style={[
                styles.caret,
                { borderColor: colors.text, transform: [{ rotate: open ? '-135deg' : '45deg' }] },
              ]}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.rule, { backgroundColor: colors.border, marginHorizontal: space[5] }]} />

      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={rows.map((r) => `${r.label} ${formatValue(r.value)}`).join(', ')}
        style={{ padding: space[5], paddingTop: space[4] }}
      >
        <View style={styles.chart}>
          <View style={{ width: LABEL, gap: 12 }}>
            {rows.map((r) => (
              <Text
                key={r.label}
                numberOfLines={1}
                style={[styles.label, { color: colors.textSubtle, fontSize: font.size.md }]}
              >
                {r.label}
              </Text>
            ))}
          </View>
          <View
            style={styles.grow}
            onLayout={(e: LayoutChangeEvent) => setPlot(e.nativeEvent.layout.width)}
          >
            {/* Dashed grid lines at each step of the scale. */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.grid]}>
              {Array.from({ length: STEPS + 1 }, (_, i) => (
                <Dashes key={i} color={colors.borderStrong} />
              ))}
            </View>
            <View style={{ gap: 12 }}>
              {rows.map((r, i) => (
                <Bar
                  key={`${r.label}-${period ?? ''}`}
                  index={i}
                  value={r.value}
                  max={top}
                  width={plot}
                  color={fill}
                  empty={withAlpha(colors.text, 0.08)}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={[styles.axis, { marginLeft: LABEL }]}>
          {Array.from({ length: STEPS + 1 }, (_, i) => (
            <Text
              key={i}
              style={{
                color: colors.textSubtle,
                fontSize: font.size.sm,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatValue((top / STEPS) * i)}
            </Text>
          ))}
        </View>
      </View>

      {open && periods && onPeriodChange ? (
        <Animated.View
          entering={reduced ? undefined : ZoomIn.duration(durations.base).easing(easings.standard)}
          exiting={reduced ? undefined : FadeOut.duration(durations.quick)}
          style={[
            styles.menu,
            {
              top: space[5] + 44,
              right: space[5],
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderRadius: radius.md,
              boxShadow: shadow.lg,
            },
          ]}
        >
          {periods.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: p === period }}
              onPress={() => {
                setOpen(false);
                if (p !== period) onPeriodChange(p);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: pressed || p === period ? colors.surfaceSunken : 'transparent',
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Animated.Text
                entering={reduced ? undefined : FadeIn.duration(durations.base)}
                style={{
                  color: colors.text,
                  fontSize: font.size.md,
                  fontWeight: p === period ? font.weight.semibold : font.weight.regular,
                }}
              >
                {p}
              </Animated.Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A vertical dashed line drawn as short segments, which renders the same everywhere. */
function Dashes({ color }: { color: string }) {
  return (
    <View style={styles.dashes}>
      {Array.from({ length: 14 }, (_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function Bar({
  index,
  value,
  max,
  width,
  color,
  empty,
}: {
  index: number;
  value: number;
  max: number;
  width: number;
  color: string;
  empty: string;
}) {
  const reduced = useReduceMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  const target = width * Math.min(1, Math.max(0, value / max));

  useEffect(() => {
    if (width <= 0) return;
    grow.set(reduced ? 1 : withDelay(index * 90, withSpring(1, spring('smooth'))));
  }, [width, index, reduced, grow]);

  const style = useAnimatedStyle(() => ({ width: Math.max(0, target * grow.get()) }));

  if (value <= 0) {
    return <View style={[styles.placeholder, { backgroundColor: empty }]} />;
  }
  return (
    <View style={styles.barSlot}>
      <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  caret: { width: 7, height: 7, borderRightWidth: 1.75, borderBottomWidth: 1.75, marginTop: -3 },
  rule: { height: StyleSheet.hairlineWidth },
  chart: { flexDirection: 'row' },
  label: { height: BAR, lineHeight: BAR },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginRight: -1 },
  dashes: { width: 1, justifyContent: 'space-between', paddingVertical: 2 },
  dash: { width: 1, height: 3 },
  barSlot: { height: BAR, justifyContent: 'center' },
  bar: { height: BAR, borderRadius: 5 },
  placeholder: { width: BAR, height: BAR, borderRadius: 5 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginRight: -6 },
  menu: {
    position: 'absolute',
    minWidth: 140,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: { minHeight: minTouchTarget, justifyContent: 'center', paddingHorizontal: 12 },
});
