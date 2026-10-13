import { Canvas, Group, Path, Skia, rect, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type StarRatingProps = {
  value: number;
  /** Leave unset for a read-only rating. */
  onValueChange?: (value: number) => void;
  /** Number of stars. Defaults to 5. */
  max?: number;
  /** Allow half stars. Defaults to false. */
  allowHalf?: boolean;
  /** Tapping the current rating clears it. Defaults to true. */
  clearable?: boolean;
  /** Width of one star. Defaults to 32. */
  size?: number;
  /** Fill colour. Defaults to the theme azure. */
  color?: string;
  /** What is rated, read before the value, e.g. "Your rating". Defaults to 'Rating'. */
  accessibilityLabel?: string;
  /** A tick for each star crossed. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** A five-pointed star in a `size` box, its points a little short of the edges. */
function starPath(size: number): SkPath {
  const b = Skia.PathBuilder.Make();
  const c = size / 2;
  const outer = size * 0.5;
  const inner = outer * 0.48;
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return { x: c + Math.cos(a) * r, y: c + 2 + Math.sin(a) * r };
  });
  // Rounded once here, with a curve through each corner, rather than by a path effect
  // on every frame.
  const ROUND = 0.16;
  const towards = (from: { x: number; y: number }, to: { x: number; y: number }) => ({
    x: from.x + (to.x - from.x) * ROUND,
    y: from.y + (to.y - from.y) * ROUND,
  });
  points.forEach((p, i) => {
    const prev = points[(i + 9) % 10]!;
    const next = points[(i + 1) % 10]!;
    const into = towards(p, prev);
    const out = towards(p, next);
    if (i === 0) b.moveTo(into.x, into.y);
    else b.lineTo(into.x, into.y);
    b.quadTo(p.x, p.y, out.x, out.y);
  });
  b.close();
  return b.detach();
}

/**
 * Stars you tap or drag across. As the rating changes the fill runs from one
 * star to the next, and each one swells a little as it fills, so a new rating
 * reads as a sweep rather than a jump.
 */
export function StarRating({
  value,
  onValueChange,
  max = 5,
  allowHalf = false,
  clearable = true,
  size = 32,
  color,
  accessibilityLabel = 'Rating',
  haptics = true,
  disabled = false,
  testID,
  style,
}: StarRatingProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const fill = color ?? colors.azure;
  const readOnly = !onValueChange;
  const gap = Math.round(size * 0.22);
  const width = max * size + (max - 1) * gap;
  const unit = allowHalf ? 0.5 : 1;

  const star = useMemo(() => starPath(size), [size]);
  const level = useSharedValue(value);
  const moving = useSharedValue(0);
  const committed = useSharedValue(value);

  useEffect(() => {
    committed.set(value);
    if (reduced) {
      level.set(value);
      return;
    }
    // About 70 ms per star crossed, so a big change still feels like a sweep.
    const duration = Math.min(520, 120 + Math.abs(value - level.get()) * 70);
    level.set(withTiming(value, { duration, easing: easings.standard }));
    moving.set(withSequence(withTiming(1, { duration: 60 }), withDelay(duration, withTiming(0))));
  }, [value, reduced, level, moving, committed]);

  const valueAt = (x: number) => {
    'worklet';
    const i = Math.floor(x / (size + gap));
    const within = (x - i * (size + gap)) / size;
    const raw = i + (unit === 0.5 && within < 0.5 ? 0.5 : 1);
    return Math.max(unit, Math.min(max, raw));
  };

  const emit = (next: number) => {
    haptic('tick');
    onValueChange?.(next);
  };

  const pan = Gesture.Pan()
    .withTestId('star-rating')
    .enabled(!readOnly && !disabled)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const next = valueAt(e.x);
      if (next !== committed.get()) {
        committed.set(next);
        scheduleOnRN(emit, next);
      }
    });
  const tap = Gesture.Tap()
    .withTestId('star-rating-tap')
    .enabled(!readOnly && !disabled)
    .onEnd((e) => {
      const hit = valueAt(e.x);
      const next = clearable && hit === committed.get() ? 0 : hit;
      committed.set(next);
      scheduleOnRN(emit, next);
    });

  const format = (v: number) => `${v} of ${max} stars`;
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (readOnly || disabled) return;
    const next = Math.max(
      0,
      Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? unit : -unit)),
    );
    if (next !== value) emit(next);
  };

  const canvas = (
    <Canvas style={{ width, height: size + 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          index={i}
          x={i * (size + gap)}
          size={size}
          path={star}
          level={level}
          moving={moving}
          fill={fill}
          track={colors.track}
        />
      ))}
    </Canvas>
  );

  const a11y = readOnly
    ? ({
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: `${accessibilityLabel}: ${format(value)}`,
      } as const)
    : ({
        accessible: true,
        accessibilityRole: 'adjustable',
        accessibilityLabel,
        accessibilityValue: { min: 0, max, now: value, text: format(value) },
        accessibilityState: { disabled },
        accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
        onAccessibilityAction,
      } as const);

  return readOnly ? (
    <View testID={testID} {...a11y} style={[{ width }, style]}>
      {canvas}
    </View>
  ) : (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        collapsable={false}
        testID={testID}
        {...a11y}
        style={[styles.box, { width, opacity: disabled ? 0.45 : 1 }, style]}
      >
        {canvas}
      </View>
    </GestureDetector>
  );
}

type StarProps = {
  index: number;
  x: number;
  size: number;
  path: SkPath;
  level: SharedValue<number>;
  moving: SharedValue<number>;
  fill: string;
  track: string;
};

function Star({ index, x, size, path, level, moving, fill, track }: StarProps) {
  // How full this star is, 0 to 1.
  const share = useDerivedValue(() => Math.max(0, Math.min(1, level.get() - index)));
  const clip = useDerivedValue(() => rect(0, 0, size * share.get(), size + 4));
  const transform = useDerivedValue(() => {
    // Swells while it fills, only during a change, so a resting half star stays flat.
    const swell = 1 + Math.sin(share.get() * Math.PI) * 0.28 * moving.get();
    return [{ scale: swell }];
  });

  return (
    <Group transform={[{ translateX: x }]}>
      <Group origin={{ x: size / 2, y: size / 2 + 2 }} transform={transform}>
        <Path path={path} color={track} />
        <Group clip={clip}>
          <Path path={path} color={fill} />
        </Group>
      </Group>
    </Group>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: minTouchTarget, justifyContent: 'center' },
});
