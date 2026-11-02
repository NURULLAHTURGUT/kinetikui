import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type RainBarsProps = {
  /** Heading, e.g. "Steady Rain". */
  title: string;
  /** Total in the corner, e.g. 19. */
  total: number;
  /** Unit after the total. Defaults to "MM". */
  unit?: string;
  /** Rain in each period, oldest first. The first bar is now. */
  amounts: number[];
  /** Time labels spread under the bars, e.g. ["NOW", "12:30", "13:00"]. */
  times: string[];
  style?: StyleProp<ViewStyle>;
};

const CHART = 56;
const MIN_BAR = 6;
const DROPS = [0.12, 0.3, 0.46, 0.63, 0.82];

/** Bar lengths in points: rain scaled to the wettest period, with a floor so dry spells show. */
export function barLengths(amounts: number[], chart: number): number[] {
  const most = Math.max(...amounts, 0.001);
  return amounts.map((a) => Math.max(MIN_BAR, (Math.max(0, a) / most) * chart));
}

/**
 * A short rain forecast: bars hang from a bright band like a curtain, reaching
 * down in turn from now onwards, while a few drops keep falling across them.
 */
export function RainBars({ title, total, unit = 'MM', amounts, times, style }: RainBarsProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const lengths = barLengths(amounts, CHART);

  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${total} ${unit} expected`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.1 4 4 0 0 1 17.5 15Z"
            fill={colors.highlight}
          />
          <Path
            d="M8 18l-1 3M12.5 18l-1 3M17 18l-1 3"
            stroke={TEAL}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
        <Text
          numberOfLines={1}
          style={[
            styles.grow,
            { color: TEAL, fontSize: font.size.sm, fontWeight: font.weight.semibold },
          ]}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          {total}
          <Text style={{ fontSize: font.size.xs - 2 }}> {unit}</Text>
        </Text>
      </View>

      <View
        testID="rain-bars-chart"
        style={[styles.chart, gradient(BAND)]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.bars}>
          {lengths.map((length, i) => (
            <Bar key={i} index={i} length={length} now={i === 0} />
          ))}
        </View>
        {width > 0 && !reduced
          ? DROPS.map((x, i) => <Drop key={x} left={x * width} delay={i * 260} />)
          : null}
      </View>

      <View style={styles.times}>
        {times.map((time, i) => (
          <Text
            key={time}
            style={{
              color: i === 0 ? colors.highlight : MUTED,
              fontSize: font.size.xs - 1,
              fontWeight: i === 0 ? font.weight.bold : font.weight.regular,
            }}
          >
            {time}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({ index, length, now }: { index: number; length: number; now: boolean }) {
  const reduced = useReduceMotion();
  const grown = useSharedValue(reduced ? length : 0);
  useEffect(() => {
    grown.set(reduced ? length : withDelay(index * 18, withSpring(length, spring('smooth'))));
  }, [index, length, reduced, grown]);
  const reach = useAnimatedStyle(() => ({ height: Math.max(0, grown.get()) }));
  return <Animated.View style={[styles.bar, gradient(now ? NOW_BAR : RAIN_BAR), reach]} />;
}

/** One falling drop: a looped view, so it costs no re-render. */
function Drop({ left, delay }: { left: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1100, easing: easings.exit }), -1, false),
      ),
    );
  }, [delay, t]);
  const fall = useAnimatedStyle(() => ({
    opacity: Math.sin(t.get() * Math.PI) * 0.9,
    transform: [{ translateY: t.get() * CHART }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.drop, { left }, fall]} />;
}

const MUTED = 'hsl(190, 8%, 60%)';
const TEAL = 'hsl(186, 72%, 62%)';
const BAND = 'linear-gradient(180deg, hsla(188, 60%, 26%, 0.34) 0%, hsla(188, 60%, 12%, 0) 100%)';
const RAIN_BAR = 'linear-gradient(180deg, hsl(186, 84%, 66%) 0%, hsla(190, 80%, 40%, 0.16) 100%)';
const NOW_BAR = 'linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsla(0, 0%, 100%, 0.24) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(190, 14%, 5%)',
    padding: 16,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grow: { flex: 1 },
  chart: { height: CHART, overflow: 'hidden', borderRadius: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-start', gap: 2.5, flex: 1 },
  bar: { flex: 1, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  drop: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: 9,
    borderRadius: 1,
    backgroundColor: 'hsl(190, 90%, 88%)',
  },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
