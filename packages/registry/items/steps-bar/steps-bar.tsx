import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type StepsBarProps = {
  steps: number;
  /** Daily goal. Defaults to 10000. */
  goal?: number;
  /** Distance line, e.g. "4.2 KM". */
  distance?: string;
  /** Climb line, e.g. "9 FLOORS". */
  climb?: string;
  /** Label over the count. Defaults to "STEPS". */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const TRACK_H = 26;
const KNOB = 24;

/** 10000 as "10K", 2500 as "2.5K". */
export function compactCount(value: number): string {
  if (value < 1000) return String(value);
  const k = value / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}

/**
 * Steps towards a goal: the bar fills from olive to bright green as a small walker
 * strides along its front and the count climbs. The walker stops once the goal is
 * reached.
 */
export function StepsBar({
  steps,
  goal = 10000,
  distance,
  climb,
  label = 'STEPS',
  style,
}: StepsBarProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const shown = Math.round(useCountUp(steps, { instant: reduced }));
  const share = Math.max(0, Math.min(1, steps / goal));
  const walking = share < 1 && !reduced;

  const at = useSharedValue(reduced ? share : 0);
  const stride = useSharedValue(0);

  useEffect(() => {
    at.set(reduced ? share : withSpring(share, spring('smooth')));
  }, [share, reduced, at]);

  useEffect(() => {
    if (!walking) {
      stride.set(0);
      return;
    }
    stride.set(withRepeat(withTiming(1, { duration: 420, easing: easings.inOut }), -1, true));
  }, [walking, stride]);

  const fill = useAnimatedStyle(() => ({
    width: KNOB + at.get() * Math.max(0, width - KNOB),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: at.get() * Math.max(0, width - KNOB) }],
  }));
  const walker = useAnimatedStyle(() => ({
    transform: [{ translateY: -stride.get() * 1.5 }, { rotate: `${(stride.get() - 0.5) * 12}deg` }],
  }));

  const small = { color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium } as const;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={[`${steps.toLocaleString('en-US')} ${label}`, distance, climb]
        .filter(Boolean)
        .join(', ')}
      accessibilityValue={{ min: 0, max: goal, now: Math.min(steps, goal) }}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <View>
          <Text style={{ color: GREEN, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
            {label}
          </Text>
          <Text
            style={{
              color: colors.highlight,
              fontSize: font.size.xl,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {shown.toLocaleString('en-US')}
          </Text>
        </View>
        <View style={styles.side}>
          {distance ? <Text style={small}>↔ {distance}</Text> : null}
          {climb ? <Text style={small}>↑ {climb}</Text> : null}
        </View>
      </View>

      <View
        testID="steps-bar-track"
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.fill, gradient(FILL), fill]} />
        <Animated.View style={[styles.knob, knob]}>
          <Animated.View style={walker}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={13} cy={4} r={2.2} fill={KNOB_INK} />
              <Path
                d="M12 8 8 10.5V14M12 8l1.5 5.5L17 16M13.5 13.5 11 17l-2.5 4M12 8l4 2.5 2.5-.5"
                stroke={KNOB_INK}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.scale}>
        {[0, goal / 2, goal].map((tick) => (
          <Text key={tick} style={{ color: MUTED, fontSize: font.size.xs - 2 }}>
            {compactCount(tick)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const MUTED = 'hsl(80, 4%, 66%)';
const GREEN = 'hsl(92, 76%, 56%)';
const KNOB_INK = 'hsl(90, 70%, 10%)';
const FILL =
  'linear-gradient(90deg, hsl(70, 56%, 18%) 0%, hsl(84, 70%, 38%) 62%, hsl(96, 84%, 52%) 100%)';

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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  side: { alignItems: 'flex-end', gap: 2 },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
    backgroundColor: 'hsl(0, 0%, 15%)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hsl(96, 92%, 66%)',
    boxShadow: '0px 0px 12px hsla(96, 92%, 60%, 0.7)',
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
});
