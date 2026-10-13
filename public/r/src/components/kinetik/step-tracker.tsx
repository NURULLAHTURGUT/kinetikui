import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type StepTrackerProps = {
  /** One short label per step, e.g. ['Cart', 'Address', 'Payment', 'Review']. */
  steps: readonly string[];
  /** Index of the current step. `steps.length` means every step is done. */
  current: number;
  /** Lets people go back to a finished step. Only finished steps respond. */
  onStepPress?: (index: number) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const NODE = 28;
const LINE = 2;

/**
 * Progress through a multi-step flow. The line fills toward the next step on
 * a spring, finished steps fill and take a check as the line reaches them,
 * and the step you arrive at sends out one soft ring.
 */
export function StepTracker({ steps, current, onStepPress, testID, style }: StepTrackerProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const count = steps.length;
  const clamped = Math.max(0, Math.min(count, current));

  const p = useSharedValue(Math.min(clamped, count - 1));
  useEffect(() => {
    p.set(withSpring(Math.min(clamped, count - 1), spring('smooth', reduced)));
  }, [clamped, count, reduced, p]);

  const column = count > 0 ? width / count : 0;
  const span = Math.max(0, width - column);
  const fill = useAnimatedStyle(() => ({
    width: count > 1 ? (span * p.get()) / (count - 1) : 0,
  }));

  return (
    <View testID={testID} style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.track,
          { left: column / 2, right: column / 2, backgroundColor: colors.track },
        ]}
      />
      <Animated.View
        style={[styles.track, { left: column / 2, backgroundColor: colors.azure }, fill]}
      />
      <View style={styles.row}>
        {steps.map((label, i) => (
          <Step
            key={`${i}-${label}`}
            index={i}
            count={count}
            label={label}
            state={i < clamped ? 'done' : i === clamped ? 'current' : 'upcoming'}
            reduced={reduced}
            onPress={onStepPress && i < clamped ? () => onStepPress(i) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

type StepState = 'done' | 'current' | 'upcoming';

type StepProps = {
  index: number;
  count: number;
  label: string;
  state: StepState;
  reduced: boolean;
  onPress?: () => void;
};

function Step({ index, count, label, state, reduced, onPress }: StepProps) {
  const { colors, font } = useKinetikTheme();
  const done = useSharedValue(state === 'done' ? 1 : 0);
  const active = useSharedValue(state === 'current' ? 1 : 0);
  const halo = useSharedValue(0);

  useEffect(() => {
    // Wait for the line to arrive before a step changes, so the eye follows the fill.
    const wait = reduced ? 0 : durations.quick;
    done.set(withDelay(wait, withSpring(state === 'done' ? 1 : 0, spring('bouncy', reduced))));
    active.set(withDelay(wait, withSpring(state === 'current' ? 1 : 0, spring('smooth', reduced))));
    if (state === 'current' && !reduced) {
      halo.set(
        withDelay(
          wait,
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: durations.slow * 1.5, easing: easings.standard }),
          ),
        ),
      );
    }
  }, [state, reduced, done, active, halo]);

  const node = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.get(), [0, 1], [colors.surface, colors.azure]),
    borderColor: interpolateColor(
      Math.max(done.get(), active.get()),
      [0, 1],
      [colors.borderStrong, colors.azure],
    ),
    transform: [{ scale: 1 + Math.sin(Math.min(1, Math.max(0, done.get())) * Math.PI) * 0.12 }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: halo.get() > 0 && halo.get() < 1 ? (1 - halo.get()) * 0.5 : 0,
    transform: [{ scale: 1 + halo.get() * 0.9 }],
  }));
  const dot = useAnimatedStyle(() => ({
    opacity: active.get() * (1 - done.get()),
    transform: [{ scale: active.get() }],
  }));
  const check = useAnimatedStyle(() => ({
    opacity: done.get(),
    transform: [{ rotate: '45deg' }, { scale: 0.5 + Math.max(0, done.get()) * 0.5 }],
  }));
  const number = useAnimatedStyle(() => ({ opacity: 1 - Math.max(done.get(), active.get()) }));

  const status = state === 'done' ? 'done' : state === 'current' ? 'current step' : 'not started';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}, step ${index + 1} of ${count}, ${status}`}
      accessibilityHint={onPress ? 'Goes back to this step' : undefined}
      style={styles.step}
    >
      <View style={styles.nodeBox}>
        <Animated.View style={[styles.halo, { backgroundColor: colors.azure }, ring]} />
        <Animated.View style={[styles.node, node]}>
          <Animated.Text
            style={[
              styles.number,
              { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold },
              number,
            ]}
          >
            {index + 1}
          </Animated.Text>
          <Animated.View style={[styles.dot, { backgroundColor: colors.azure }, dot]} />
          <Animated.View style={[styles.check, { borderColor: colors.onAzure }, check]} />
        </Animated.View>
      </View>
      <Text
        numberOfLines={2}
        style={[
          styles.label,
          {
            color: { done: colors.textMuted, current: colors.text, upcoming: colors.textSubtle }[
              state
            ],
            fontSize: font.size.xs,
            fontWeight: state === 'current' ? font.weight.semibold : font.weight.medium,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: NODE / 2 - LINE / 2 + 8, height: LINE, borderRadius: LINE },
  row: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center', gap: 8, paddingTop: 8, minHeight: 44 },
  nodeBox: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: NODE, height: NODE, borderRadius: NODE / 2 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { position: 'absolute' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  check: {
    position: 'absolute',
    width: 6,
    height: 11,
    marginTop: -3,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  label: { textAlign: 'center', paddingHorizontal: 2 },
});
