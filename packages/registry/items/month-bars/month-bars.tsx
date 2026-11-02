import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type MonthBar = {
  /** Short label, e.g. "MAY". */
  label: string;
  value: number;
};

export type MonthBarsProps = {
  /** Months, oldest first. The last one starts selected. */
  months: MonthBar[];
  /** Symbol before the figure. Defaults to "$". */
  currency?: string;
  /** Vibrate on tap. Defaults to true. */
  haptics?: boolean;
  /** Called with the index of a tapped month. */
  onSelect?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

const CHART = 62;
const FLOOR = 0.34;

function money(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The change from the month before, and "+" or "−" in front of it. */
export function monthDelta(months: MonthBar[], index: number): { sign: string; amount: string } {
  const change =
    (months[index]?.value ?? 0) - (months[index - 1]?.value ?? months[index]?.value ?? 0);
  return { sign: change < 0 ? '−' : '+', amount: money(Math.abs(change)) };
}

/**
 * Spending by month: bars rise from the floor in turn and the picked month lights
 * up in teal. Tap another month and the figure counts to it, cents dimmed.
 */
export function MonthBars({
  months,
  currency = '$',
  haptics = true,
  onSelect,
  style,
}: MonthBarsProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [picked, setPicked] = useState(months.length - 1);
  const value = months[picked]?.value ?? 0;
  const delta = monthDelta(months, picked);
  const most = Math.max(...months.map((m) => m.value), 1);
  const least = Math.min(...months.map((m) => m.value));
  const range = Math.max(1, most - least);

  // Cents as a whole number, so the figure can never round to ".100".
  const cents = Math.round(useCountUp(value, { instant: reduced }) * 100);
  const whole = Math.floor(cents / 100).toLocaleString('en-US');
  const part = String(cents % 100).padStart(2, '0');

  return (
    <View style={[styles.card, style]}>
      <View
        accessible
        accessibilityLabel={`${months[picked]?.label}: ${currency}${money(value)}, ${delta.sign}${delta.amount}`}
        style={styles.head}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3V6Zm0 5h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Zm3 4v2h5v-2H6Z"
            fill={colors.highlight}
            fillRule="evenodd"
          />
        </Svg>
        <Text
          numberOfLines={1}
          style={{
            color: colors.highlight,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {currency} {whole}
          <Text style={{ color: MUTED }}>.{part}</Text>
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: DELTA, fontSize: font.size.xs, fontWeight: font.weight.semibold }}
        >
          {delta.sign}
          {delta.amount}
        </Text>
      </View>

      <View style={styles.bars}>
        {months.map((month, i) => (
          <Column
            key={month.label}
            month={month}
            index={i}
            share={FLOOR + (1 - FLOOR) * ((month.value - least) / range)}
            picked={i === picked}
            onPress={() => {
              haptic('tick');
              setPicked(i);
              onSelect?.(i);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Column({
  month,
  index,
  share,
  picked,
  onPress,
}: {
  month: MonthBar;
  index: number;
  share: number;
  picked: boolean;
  onPress: () => void;
}) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const height = share * CHART;
  const grown = useSharedValue(reduced ? height : 0);
  useEffect(() => {
    grown.set(reduced ? height : withDelay(index * 55, withSpring(height, spring('smooth'))));
  }, [index, height, reduced, grown]);
  const rise = useAnimatedStyle(() => ({ height: Math.max(0, grown.get()) }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: picked }}
      accessibilityLabel={`${month.label}, ${month.value}`}
      onPress={onPress}
      style={styles.column}
    >
      <View style={styles.plot}>
        <Animated.View style={[styles.bar, gradient(picked ? PICKED : BAR), rise]} />
      </View>
      <Text
        style={{
          color: picked ? colors.highlight : MUTED,
          fontSize: font.size.xs - 2,
          fontWeight: picked ? font.weight.bold : font.weight.regular,
        }}
      >
        {month.label}
      </Text>
    </Pressable>
  );
}

const MUTED = 'hsl(0, 0%, 60%)';
const DELTA = 'hsl(354, 90%, 66%)';
const BAR = 'linear-gradient(180deg, hsl(0, 0%, 30%) 0%, hsl(0, 0%, 10%) 100%)';
const PICKED = 'linear-gradient(180deg, hsl(172, 72%, 56%) 0%, hsl(176, 70%, 18%) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    padding: 16,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bars: { flexDirection: 'row', gap: 3 },
  column: { flex: 1, alignItems: 'center', gap: 4, minHeight: 44 },
  plot: { height: CHART, alignSelf: 'stretch', justifyContent: 'flex-end' },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderTopWidth: 1.5,
    borderTopColor: 'hsla(0, 0%, 100%, 0.36)',
  },
});
