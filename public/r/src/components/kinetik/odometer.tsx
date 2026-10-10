import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, spring, springs } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type OdometerProps = {
  value: number;
  /** Fraction digits shown. Defaults to 0. */
  decimals?: number;
  /** BCP 47 locale for separators. Defaults to the device locale. */
  locale?: string;
  /** Text before the number, e.g. a currency sign. */
  prefix?: string;
  /** Text after the number, e.g. a unit. */
  suffix?: string;
  /** Full control over formatting. Digits 0–9 in the result roll; everything else is static. */
  format?: (value: number) => string;
  /** Extra delay per column, right to left, in ms. Defaults to 24. */
  stagger?: number;
  /** Announce changes to screen readers. Defaults to false. */
  announce?: boolean;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

const DIGITS = Array.from({ length: 20 }, (_, i) => String(i % 10));

/**
 * A number whose digits roll like a mechanical counter. Each column spins
 * forward when the value grows and backward when it shrinks, the long way
 * round when needed (9 → 0 rolls on to 0, not back through 8…1).
 */
export function Odometer({
  value,
  decimals = 0,
  locale,
  prefix = '',
  suffix = '',
  format,
  stagger = 24,
  announce = false,
  style,
  containerStyle,
}: OdometerProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [height, setHeight] = useState(0);
  // Roll direction follows the last change (state adjusted during render, per React docs).
  const [last, setLast] = useState(value);
  const [direction, setDirection] = useState(1);
  if (value !== last) {
    setLast(value);
    setDirection(value > last ? 1 : -1);
  }

  const formatter = useMemo(
    () =>
      format ??
      ((v: number) =>
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(v)),
    [format, locale, decimals],
  );
  const text = `${prefix}${formatter(value)}${suffix}`;

  // Key characters by their distance from the right so existing columns keep
  // their identity when the number gains or loses digits on the left.
  const chars = [...text].map((ch, i, all) => ({ ch, key: `p${all.length - 1 - i}` }));

  const textStyle: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size['3xl'],
      fontWeight: font.weight.bold,
      fontVariant: ['tabular-nums'],
    },
    style,
  ];

  const layout = reduced
    ? undefined
    : LinearTransition.springify()
        .mass(springs.smooth.mass)
        .stiffness(springs.smooth.stiffness)
        .damping(springs.smooth.damping);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      accessibilityLiveRegion={announce ? 'polite' : 'none'}
      style={[styles.row, containerStyle]}
    >
      {/* Measures one line so columns can clip to it. */}
      <Text
        style={[textStyle, styles.probe]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        8
      </Text>
      {height > 0 &&
        chars.map(({ ch, key }, i) => {
          const isDigit = ch >= '0' && ch <= '9';
          const column = chars.length - 1 - i;
          return (
            <Animated.View
              key={key + (isDigit ? 'd' : ch)}
              layout={layout}
              entering={reduced ? undefined : FadeIn.duration(durations.base)}
              exiting={reduced ? undefined : FadeOut.duration(durations.quick)}
            >
              {isDigit ? (
                <Column
                  digit={Number(ch)}
                  height={height}
                  direction={direction}
                  delay={column * stagger}
                  reduced={reduced}
                  textStyle={textStyle}
                />
              ) : (
                <Text style={textStyle}>{ch}</Text>
              )}
            </Animated.View>
          );
        })}
    </View>
  );
}

function Column({
  digit,
  height,
  direction,
  delay,
  reduced,
  textStyle,
}: {
  digit: number;
  height: number;
  direction: number;
  delay: number;
  reduced: boolean;
  textStyle: StyleProp<TextStyle>;
}) {
  // Position on a 0–19 strip (two copies of 0–9) so a column can roll past 9.
  const pos = useSharedValue(digit);

  useEffect(() => {
    if (reduced) {
      pos.set(digit);
      return;
    }
    const mod10 = (n: number) => ((n % 10) + 10) % 10;
    // Rebase onto the copy of 0–9 that leaves room to roll in the needed
    // direction; both copies look identical, so this jump is invisible.
    let from = pos.get();
    if (direction > 0 && from >= 10) from -= 10;
    if (direction < 0 && from < 10) from += 10;
    // Works mid-animation too: `from` may sit between two digits.
    const to = direction > 0 ? from + mod10(digit - from) : from - mod10(from - digit);
    if (Math.abs(to - from) < 0.001) return;
    pos.set(from);
    pos.set(
      withDelay(
        delay,
        withSpring(to, spring('smooth'), (finished) => {
          'worklet';
          if (finished) pos.set(((to % 10) + 10) % 10);
        }),
      ),
    );
  }, [digit, direction, delay, reduced, pos]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateY: -pos.get() * height }] }));

  return (
    <View style={{ height, overflow: 'hidden' }}>
      {/* Invisible copy of the digit gives the column its width. */}
      <Text style={[textStyle, styles.ghost]}>{digit}</Text>
      <Animated.View style={[styles.strip, strip]}>
        {DIGITS.map((d, i) => (
          <Text key={i} style={[textStyle, { height, lineHeight: height }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'flex-start' },
  probe: { position: 'absolute', opacity: 0 },
  ghost: { opacity: 0 },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
});
