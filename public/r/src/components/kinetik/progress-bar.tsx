import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCountUp } from '../../lib/kinetik/hooks/use-count-up';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { easings, spring, timing } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type ProgressBarProps = {
  /** From 0 to 1, or null while the amount of work is unknown. */
  value: number | null;
  /** What is in progress, e.g. "Uploading 3 photos". Shown above the bar. */
  label?: string;
  /** The percentage on the right. Defaults to true. */
  showValue?: boolean;
  /** Bar thickness. Defaults to "md". */
  size?: 'sm' | 'md';
  /** Replaces the percentage once the bar is full. Defaults to "Done". */
  doneLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A progress bar that springs to each new amount while a soft sheen travels
 * along the fill. The percentage counts up beside the label; at 100% the fill
 * turns green and "Done" takes the number's place. With no value it shows an
 * indeterminate segment that sweeps the track.
 */
export function ProgressBar({
  value,
  label,
  showValue = true,
  size = 'md',
  doneLabel = 'Done',
  testID,
  style,
}: ProgressBarProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const known = value !== null;
  const v = known ? Math.min(1, Math.max(0, value)) : 0;
  const done = known && v >= 1;
  const percent = Math.round(v * 100);
  const shown = useCountUp(percent, { duration: 600, instant: reduced });
  const h = size === 'sm' ? 6 : 10;
  const [width, setWidth] = useState(0);

  const fill = useSharedValue(v);
  const finish = useSharedValue(done ? 1 : 0);
  const sweep = useSharedValue(0);
  const pop = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    fill.set(withSpring(v, spring('smooth', reduced)));
  }, [v, reduced, fill]);
  useEffect(() => {
    finish.set(withTiming(done ? 1 : 0, timing('base', reduced)));
    pop.set(
      done
        ? withSequence(withTiming(0, { duration: 0 }), withSpring(1, spring('bouncy', reduced)))
        : 0,
    );
  }, [done, reduced, finish, pop]);

  // The sheen (or the indeterminate segment) loops only while work is under way.
  const moving = !done && !reduced && (!known || v > 0);
  useEffect(() => {
    if (!moving) {
      cancelAnimation(sweep);
      sweep.set(0);
      return;
    }
    sweep.set(0);
    sweep.set(
      withRepeat(
        withTiming(1, {
          duration: known ? 1600 : 1300,
          easing: known ? easings.linear : easings.inOut,
        }),
        -1,
      ),
    );
    return () => cancelAnimation(sweep);
  }, [moving, known, sweep]);

  const bar = useAnimatedStyle(() => {
    if (!known) {
      const t = sweep.get();
      const w = 0.28 + Math.sin(t * Math.PI) * 0.14;
      return {
        width: width * w,
        transform: [{ translateX: -width * w + t * (width + width * w) }],
        backgroundColor: colors.azure,
      };
    }
    return {
      width: Math.max(0, fill.get()) * width,
      backgroundColor: interpolateColor(finish.get(), [0, 1], [colors.azure, colors.success]),
    };
  });
  const sheen = useAnimatedStyle(() => ({
    opacity: known && moving ? 1 : 0,
    transform: [{ translateX: -80 + sweep.get() * (width + 80) }],
  }));
  const check = useAnimatedStyle(() => ({
    opacity: pop.get(),
    transform: [{ scale: 0.5 + pop.get() * 0.5 }],
  }));

  const light = withAlpha(colors.highlight, 0.45);
  const clear = withAlpha(colors.highlight, 0);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Progress'}
      accessibilityValue={known ? { min: 0, max: 100, now: percent } : undefined}
      accessibilityState={{ busy: !done }}
      style={[{ gap: space[2] }, style]}
    >
      {label || showValue ? (
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium },
            ]}
          >
            {label}
          </Text>
          {showValue && known ? (
            done ? (
              <Animated.View style={[styles.done, check]}>
                <View style={[styles.tick, { borderColor: colors.success }]} />
                <Text
                  style={{
                    color: colors.success,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {doneLabel}
                </Text>
              </Animated.View>
            ) : (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: font.size.sm,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {Math.round(shown)}%
              </Text>
            )
          ) : null}
        </View>
      ) : null}
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.track,
          { height: h, backgroundColor: colors.track, borderRadius: radius.pill },
        ]}
      >
        <Animated.View style={[styles.fill, { borderRadius: radius.pill }, bar]}>
          <Animated.View
            style={[
              styles.sheen,
              gradient(`linear-gradient(to right, ${clear}, ${light}, ${clear})`),
              sheen,
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tick: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    marginTop: -3,
  },
  track: { overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, bottom: 0, width: 80 },
});
