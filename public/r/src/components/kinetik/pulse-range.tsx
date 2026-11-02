import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type PulseRangeProps = {
  /** The latest reading. The heart beats at this rate. */
  bpm: number;
  /** Lowest reading today. */
  min: number;
  /** Highest reading today. */
  max: number;
  /** Today's average. */
  average: number;
  /** When the reading was taken, e.g. "JUST NOW". */
  ago?: string;
  /** Label over the average. Defaults to "TODAY". */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const CAPSULE_W = 84;
const CAPSULE_H = 34;
const TRACK_H = 14;

/** Where a reading sits between the day's low and high, 0–1. */
export function rangePosition(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Milliseconds per beat; clamped so an odd reading cannot make the heart flicker or stall. */
export function beatDuration(bpm: number): number {
  return 60_000 / Math.max(30, Math.min(200, bpm));
}

/**
 * The day's heart rate as a glowing range: a capsule slides along it to the latest
 * reading while its heart beats at that rate with a double thump.
 */
export function PulseRange({
  bpm,
  min,
  max,
  average,
  ago,
  label = 'TODAY',
  style,
}: PulseRangeProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const shown = Math.round(useCountUp(bpm, { instant: reduced, from: min }));
  const position = rangePosition(bpm, min, max);
  const beat = beatDuration(bpm);

  const at = useSharedValue(reduced ? position : 0);
  const thump = useSharedValue(1);

  useEffect(() => {
    at.set(reduced ? position : withSpring(position, spring('smooth')));
  }, [position, reduced, at]);

  useEffect(() => {
    if (reduced) {
      thump.set(1);
      return;
    }
    thump.set(
      withRepeat(
        withSequence(
          withTiming(1.26, { duration: beat * 0.12 }),
          withTiming(1, { duration: beat * 0.14 }),
          withTiming(1.14, { duration: beat * 0.1 }),
          withTiming(1, { duration: beat * 0.64 }),
        ),
        -1,
        false,
      ),
    );
  }, [beat, reduced, thump]);

  const capsule = useAnimatedStyle(() => ({
    transform: [{ translateX: at.get() * Math.max(0, width - CAPSULE_W) }],
  }));
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: thump.get() }] }));

  const small = { color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium } as const;

  return (
    <View
      accessible
      accessibilityLabel={`Heart rate ${bpm} beats per minute. ${label} average ${average}, low ${min}, high ${max}.${ago ? ` ${ago}.` : ''}`}
      style={[styles.card, style]}
    >
      <View style={styles.between}>
        <View>
          <Text style={small}>{label}</Text>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.md,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {average}
            <Text style={{ color: RED, fontSize: font.size.xs }}>BPM</Text>
          </Text>
        </View>
        {ago ? <Text style={small}>{ago}</Text> : null}
      </View>

      <View
        testID="pulse-range-track"
        style={styles.stage}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.track, gradient(TRACK)]} />
        <Animated.View style={[styles.capsule, gradient(CAPSULE), capsule]}>
          <Animated.View style={heart}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path
                d="M12 21s-9-6.3-9-12.5A5 5 0 0 1 12 5.6a5 5 0 0 1 9 2.9C21 14.7 12 21 12 21Z"
                fill={colors.highlight}
              />
            </Svg>
          </Animated.View>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.md,
              fontWeight: font.weight.bold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {shown}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.between}>
        <Text style={[small, styles.num]}>↓ {min}</Text>
        <Text style={[small, styles.num]}>{max} ↑</Text>
      </View>
    </View>
  );
}

const MUTED = 'hsl(0, 0%, 66%)';
const RED = 'hsl(356, 90%, 60%)';
const TRACK =
  'linear-gradient(90deg, hsl(356, 60%, 24%) 0%, hsl(356, 86%, 46%) 50%, hsl(356, 60%, 24%) 100%)';
const CAPSULE = 'linear-gradient(180deg, hsl(356, 96%, 62%) 0%, hsl(354, 84%, 42%) 100%)';

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
    gap: 8,
  },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  num: { fontVariant: ['tabular-nums'] },
  stage: { height: CAPSULE_H + 6, justifyContent: 'center' },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    boxShadow: '0px 0px 18px hsla(356, 90%, 50%, 0.5)',
  },
  capsule: {
    position: 'absolute',
    left: 0,
    width: CAPSULE_W,
    height: CAPSULE_H,
    borderRadius: CAPSULE_H / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0px 0px 20px hsla(356, 96%, 58%, 0.9)',
  },
});
