import { Canvas, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type RingSpinnerStatus = 'loading' | 'success' | 'error';

export type RingSpinnerProps = {
  /** `success` closes the ring and draws a check; `error` draws a cross. Defaults to `loading`. */
  status?: RingSpinnerStatus;
  /** 0 to 1 for a known amount of work; leave unset to spin. */
  progress?: number;
  /** Diameter. Defaults to 40. */
  size?: number;
  /** Stroke width. Defaults to size / 11. */
  thickness?: number;
  /** Arc colour while loading. Defaults to the theme azure. */
  color?: string;
  /** Names what is loading. Defaults to 'Loading'. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Each cycle the arc's tail catches up this far round the circle. */
const ADVANCE = 0.7;
const CYCLE_MS = 1500;
/** Cycles in one long run of the clock; it restarts after about four hours. */
const RUN = 10000;

const ease = (x: number) => {
  'worklet';
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * A spinner whose arc stretches and shrinks as it turns. Given `progress`, it
 * fills to the amount instead; on `success` it closes into a full ring and
 * draws a check, on `error` a cross. It stops drawing once it has settled.
 */
export function RingSpinner({
  status = 'loading',
  progress,
  size = 40,
  thickness,
  color,
  accessibilityLabel = 'Loading',
  testID,
  style,
}: RingSpinnerProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const stroke = thickness ?? Math.max(2, size / 11);
  const r = size / 2 - stroke / 2;
  const c = size / 2;
  const determinate = progress !== undefined;
  const ink =
    status === 'success'
      ? colors.success
      : status === 'error'
        ? colors.danger
        : (color ?? colors.azure);

  const { ring, check, cross } = useMemo(() => {
    const ringPath = Skia.PathBuilder.Make().addCircle(c, c, r).detach();
    const tick = Skia.PathBuilder.Make()
      .moveTo(size * 0.31, size * 0.52)
      .lineTo(size * 0.44, size * 0.64)
      .lineTo(size * 0.69, size * 0.38)
      .detach();
    const x = Skia.PathBuilder.Make()
      .moveTo(size * 0.36, size * 0.36)
      .lineTo(size * 0.64, size * 0.64)
      .moveTo(size * 0.64, size * 0.36)
      .lineTo(size * 0.36, size * 0.64)
      .detach();
    return { ring: ringPath, check: tick, cross: x };
  }, [c, r, size]);

  const clock = useSharedValue(0);
  const settle = useSharedValue(0);
  const amount = useSharedValue(progress ?? 0);
  const mark = useSharedValue(0);

  const spinning = status === 'loading' && !determinate && !reduced;
  useEffect(() => {
    if (!spinning) {
      cancelAnimation(clock);
      return;
    }
    clock.set(
      withRepeat(
        withTiming(clock.get() + RUN, { duration: CYCLE_MS * RUN, easing: Easing.linear }),
        -1,
      ),
    );
    return () => cancelAnimation(clock);
  }, [spinning, clock]);

  useEffect(() => {
    if (progress !== undefined)
      amount.set(withSpring(Math.max(0, Math.min(1, progress)), spring('smooth', reduced)));
  }, [progress, reduced, amount]);

  useEffect(() => {
    const done = status !== 'loading';
    settle.set(
      reduced
        ? done
          ? 1
          : 0
        : withTiming(done ? 1 : 0, { duration: durations.base, easing: easings.standard }),
    );
    mark.set(
      done
        ? reduced
          ? 1
          : withDelay(
              durations.quick,
              withTiming(1, { duration: durations.slow, easing: easings.standard }),
            )
        : 0,
    );
    if (done) AccessibilityInfo.announceForAccessibility(status === 'success' ? 'Done' : 'Failed');
  }, [status, reduced, settle, mark]);

  // Where the arc starts, in turns, and how much of the circle it covers.
  const arc = useDerivedValue(() => {
    const s = settle.get();
    if (determinate) {
      return { from: 0, length: amount.get() + (1 - amount.get()) * s };
    }
    if (reduced) return { from: 0, length: 0.25 + 0.75 * s };
    const k = clock.get();
    const cycle = Math.floor(k);
    const t = k - cycle;
    const head = t < 0.5 ? 0.05 + ADVANCE * ease(t / 0.5) : ADVANCE + 0.05;
    const tail = t < 0.5 ? 0 : ADVANCE * ease((t - 0.5) / 0.5);
    const length = head - tail;
    // The tail's progress carries over from cycle to cycle, and the whole arc drifts round.
    return { from: cycle * ADVANCE + tail + k * 0.2, length: length + (1 - length) * s };
  });
  const transform = useDerivedValue(() => [
    { rotate: (arc.get().from % 1) * Math.PI * 2 - Math.PI / 2 },
  ]);
  const end = useDerivedValue(() => Math.max(0.001, Math.min(1, arc.get().length)));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        status !== 'loading'
          ? { text: status === 'success' ? 'Done' : 'Failed' }
          : determinate
            ? { min: 0, max: 100, now: Math.round((progress ?? 0) * 100) }
            : undefined
      }
      style={[{ width: size, height: size }, style]}
    >
      <Canvas style={{ width: size, height: size }}>
        <Path path={ring} style="stroke" strokeWidth={stroke} color={colors.track} />
        <Group origin={vec(c, c)} transform={transform}>
          <Path
            path={ring}
            style="stroke"
            strokeWidth={stroke}
            strokeCap="round"
            color={ink}
            end={end}
          />
        </Group>
        {status === 'success' ? (
          <Path
            path={check}
            style="stroke"
            strokeWidth={stroke}
            strokeCap="round"
            strokeJoin="round"
            color={ink}
            end={mark}
          />
        ) : null}
        {status === 'error' ? (
          <Path
            path={cross}
            style="stroke"
            strokeWidth={stroke}
            strokeCap="round"
            color={ink}
            end={mark}
          />
        ) : null}
      </Canvas>
    </View>
  );
}
