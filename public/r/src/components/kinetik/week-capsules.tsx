import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type WeekDay = {
  /** One letter, e.g. "M". */
  label: string;
  minutes: number;
};

export type WeekCapsulesProps = {
  /** The days, oldest first. The last one is today. */
  days: WeekDay[];
  /** Daily goal in minutes. */
  goal: number;
  /** Top of the scale in minutes. Defaults to twice the goal. */
  max?: number;
  /** Unit after the goal. Defaults to "MIN". */
  unit?: string;
  style?: StyleProp<ViewStyle>;
};

const CAPSULE_H = 66;
const CAPSULE_W = 14;
const MIN_FILL = CAPSULE_W;

/** The rounded average minutes across the days. */
export function averageMinutes(days: WeekDay[]): number {
  if (days.length === 0) return 0;
  return Math.round(days.reduce((sum, d) => sum + d.minutes, 0) / days.length);
}

/**
 * A week of daily minutes: capsules fill from the bottom in turn, glowing once a
 * day reaches the goal, and today's capsule breathes inside a bright ring.
 */
export function WeekCapsules({ days, goal, max, unit = 'MIN', style }: WeekCapsulesProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const today = days[days.length - 1]?.minutes ?? 0;
  const shown = Math.round(useCountUp(today, { instant: reduced }));
  const average = averageMinutes(days);
  const top = max ?? goal * 2;

  return (
    <View
      accessible
      accessibilityLabel={`Today ${today} of ${goal} ${unit}. Average ${average}.`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {shown}
          <Text style={{ color: MUTED, fontSize: font.size.xs }}>
            /{goal} {unit}
          </Text>
        </Text>
        <Text style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}>
          {average} AVG
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.axis}>
          <Text style={{ color: MUTED, fontSize: font.size.xs - 2 }}>{top}</Text>
          <Text style={{ color: MUTED, fontSize: font.size.xs - 2 }}>0</Text>
        </View>
        {days.map((day, i) => (
          <Capsule
            key={`${day.label}-${i}`}
            index={i}
            label={day.label}
            share={Math.min(1, day.minutes / top)}
            met={day.minutes >= goal}
            today={i === days.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function Capsule({
  index,
  label,
  share,
  met,
  today,
}: {
  index: number;
  label: string;
  share: number;
  met: boolean;
  today: boolean;
}) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const height = Math.max(MIN_FILL, share * CAPSULE_H);
  const grown = useSharedValue(reduced ? height : 0);
  const breath = useSharedValue(0);

  useEffect(() => {
    grown.set(reduced ? height : withDelay(index * 60, withSpring(height, spring('smooth'))));
  }, [index, height, reduced, grown]);

  useEffect(() => {
    if (!today || reduced) {
      breath.set(0);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: 1500, easing: easings.inOut }), -1, true));
  }, [today, reduced, breath]);

  const fill = useAnimatedStyle(() => ({ height: Math.max(0, grown.get()) }));
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 + breath.get() * 0.45 }));

  return (
    <View style={styles.column}>
      <View style={styles.capsule}>
        <Animated.View
          style={[styles.fill, gradient(met ? MET : UNDER), met ? styles.glow : null, fill]}
        />
        {today ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, { borderColor: colors.highlight }, ring]}
          />
        ) : null}
      </View>
      <Text
        style={{
          color: today ? colors.highlight : MUTED,
          fontSize: font.size.xs - 2,
          fontWeight: today ? font.weight.bold : font.weight.regular,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const MUTED = 'hsl(180, 6%, 60%)';
const MET = 'linear-gradient(180deg, hsl(176, 92%, 72%) 0%, hsl(178, 76%, 44%) 100%)';
const UNDER = 'linear-gradient(180deg, hsl(182, 40%, 44%) 0%, hsl(184, 44%, 24%) 100%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(180, 8%, 5%)',
    padding: 16,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  body: { flexDirection: 'row', gap: 4 },
  axis: { height: CAPSULE_H, justifyContent: 'space-between', paddingRight: 4 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  capsule: {
    width: CAPSULE_W,
    height: CAPSULE_H,
    borderRadius: CAPSULE_W / 2,
    justifyContent: 'flex-end',
    backgroundColor: 'hsl(180, 6%, 16%)',
  },
  fill: { borderRadius: CAPSULE_W / 2 },
  glow: { boxShadow: '0px 0px 10px hsla(176, 92%, 60%, 0.6)' },
  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 1.5,
    borderRadius: CAPSULE_W / 2 + 3,
  },
});
