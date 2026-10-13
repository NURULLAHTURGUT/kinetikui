import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

export type CountdownProps = {
  /** When it reaches zero: a Date or a timestamp in milliseconds. */
  to: Date | number;
  /** Called once when the time is up. */
  onComplete?: () => void;
  /** Words under each unit. Defaults to English. */
  labels?: Partial<Record<keyof CountdownParts, string>>;
  /** Shown once the time is up. Defaults to "Live now". */
  liveLabel?: string;
  /** Read before the time by screen readers. Defaults to "Starts in". */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const UNITS: (keyof CountdownParts)[] = ['days', 'hours', 'minutes', 'seconds'];
const NAMES: Record<keyof CountdownParts, string> = {
  days: 'Days',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
};
const DIGIT_H = 44;

/** Splits a duration in milliseconds into whole days, hours, minutes and seconds. */
export function splitTime(ms: number): CountdownParts {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function spoken(p: CountdownParts): string {
  const part = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  const out: string[] = [];
  if (p.days) out.push(part(p.days, 'day'));
  if (p.hours) out.push(part(p.hours, 'hour'));
  if (p.minutes) out.push(part(p.minutes, 'minute'));
  if (out.length === 0) out.push(part(p.seconds, 'second'));
  return out.join(', ');
}

/**
 * A countdown to a launch or an event. Each digit drops in from above as it
 * changes, like a split-flap board seen side-on, and at zero the tiles step
 * back while a "Live now" pill with a beating dot takes their place.
 */
export function Countdown({
  to,
  onComplete,
  labels,
  liveLabel = 'Live now',
  accessibilityLabel = 'Starts in',
  testID,
  style,
}: CountdownProps) {
  const { colors, font } = useKinetikTheme();
  const target = typeof to === 'number' ? to : to.getTime();
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, target - now);
  const live = left <= 0;
  const parts = splitTime(left);
  // Days stay hidden for a countdown that started under a day.
  const [withDays] = useState(() => splitTime(target - Date.now()).days > 0);

  useEffect(() => {
    if (live) return;
    // Ticks on the second boundary so the seconds change together with the clock.
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(id);
  }, [live]);

  useEffect(() => {
    if (live) onComplete?.();
    // Only the moment it goes live matters, not a new callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const units = withDays ? UNITS : UNITS.slice(1);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={live ? liveLabel : `${accessibilityLabel} ${spoken(parts)}`}
      style={[styles.root, style]}
    >
      {live ? (
        <Live label={liveLabel} />
      ) : (
        <View style={styles.row}>
          {units.map((unit, i) => (
            <View key={unit} style={styles.row}>
              {i > 0 ? (
                <Text
                  style={[
                    styles.colon,
                    {
                      color: colors.textSubtle,
                      fontSize: font.size['2xl'],
                      fontWeight: font.weight.semibold,
                    },
                  ]}
                >
                  :
                </Text>
              ) : null}
              <Tile
                value={parts[unit]}
                label={labels?.[unit] ?? NAMES[unit]}
                wide={unit === 'days' && parts.days > 99}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Tile({ value, label, wide }: { value: number; label: string; wide: boolean }) {
  const { colors, font, radius } = useKinetikTheme();
  const text = String(value).padStart(wide ? 3 : 2, '0');
  return (
    <View style={styles.tile}>
      <View
        style={[
          styles.digits,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
        ]}
      >
        {Array.from(text).map((d, i) => (
          <Digit key={text.length - i} digit={d} />
        ))}
      </View>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: font.size.xs,
          letterSpacing: font.tracking.wide,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/** A digit that drops in from above when it changes while the old one falls away. */
function Digit({ digit }: { digit: string }) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [roll, setRoll] = useState({ digit, prev: digit, n: 0 });
  if (roll.digit !== digit) setRoll({ digit, prev: roll.digit, n: roll.n + 1 });
  const p = useSharedValue(1);
  useEffect(() => {
    if (roll.n === 0 || reduced) return;
    p.set(0);
    p.set(withTiming(1, { duration: durations.base + 60, easing: easings.standard }));
  }, [roll.n, reduced, p]);

  const incoming = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (p.get() - 1) * DIGIT_H * 0.55 }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - p.get(),
    transform: [{ translateY: p.get() * DIGIT_H * 0.55 }],
  }));
  const style = {
    color: colors.text,
    fontSize: font.size['2xl'],
    fontWeight: font.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  };
  return (
    <View style={styles.cell}>
      {roll.prev !== roll.digit ? (
        <Animated.Text style={[style, styles.ghost, outgoing]}>{roll.prev}</Animated.Text>
      ) : null}
      <Animated.Text style={[style, incoming]}>{digit}</Animated.Text>
    </View>
  );
}

function Live({ label }: { label: string }) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const beat = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, spring('bouncy', reduced)));
    if (reduced) return;
    beat.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: easings.inOut }),
          withTiming(0, { duration: 700, easing: easings.inOut }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(beat);
  }, [reduced, pop, beat]);

  const pill = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.get() * 1.4),
    transform: [{ scale: 0.7 + pop.get() * 0.3 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - beat.get()),
    transform: [{ scale: 1 + beat.get() * 1.4 }],
  }));

  return (
    <Animated.View
      style={[
        styles.live,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill },
        pill,
      ]}
    >
      <View style={styles.dotBox}>
        <Animated.View style={[styles.dot, { backgroundColor: colors.danger }, halo]} />
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
      </View>
      <Text
        style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', minHeight: DIGIT_H + 28 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  colon: { marginHorizontal: 4, lineHeight: DIGIT_H + 4 },
  tile: { alignItems: 'center', gap: 6 },
  digits: { flexDirection: 'row', borderWidth: 1, paddingHorizontal: 6, overflow: 'hidden' },
  cell: { height: DIGIT_H + 4, minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute' },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    height: DIGIT_H + 8,
    borderWidth: 1,
    marginTop: 4,
  },
  dotBox: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
});
