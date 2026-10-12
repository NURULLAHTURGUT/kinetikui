import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
import { withAlpha } from '../../shared/tokens/tokens';

const BAND = 180;

type Sweep = { clock: SharedValue<number>; still: boolean };
const SweepContext = createContext<Sweep | null>(null);

/** One looping clock, 0 → 1 per pass. Stops when `active` is false or motion is reduced. */
function useSweepClock(active: boolean, period: number): Sweep {
  const reduced = useReduceMotion();
  const clock = useSharedValue(0);
  const still = reduced || !active;
  useEffect(() => {
    if (still) {
      cancelAnimation(clock);
      clock.set(0);
      return;
    }
    clock.set(0);
    clock.set(
      withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.quad) }), -1),
    );
    return () => cancelAnimation(clock);
  }, [still, period, clock]);
  return { clock, still };
}

export type SkeletonGroupProps = {
  children: ReactNode;
  /** Pause the sweep, e.g. while the screen is not focused. Defaults to true. */
  active?: boolean;
  /** Time for one pass across the screen, in ms. Defaults to 1400. */
  period?: number;
  /** Announced to screen readers. Defaults to "Loading". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shares one sweep between every `Skeleton` inside it. Each skeleton offsets
 * the light by its position on screen, so a single band of light passes over
 * the whole layout instead of each block shimmering on its own.
 */
export function SkeletonGroup({
  children,
  active = true,
  period = 1400,
  accessibilityLabel = 'Loading',
  style,
}: SkeletonGroupProps) {
  const sweep = useSweepClock(active, period);
  return (
    <SweepContext.Provider value={sweep}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: true }}
        style={style}
      >
        {children}
      </View>
    </SweepContext.Provider>
  );
}

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Corner radius. Defaults to the theme `sm` radius. */
  radius?: number;
  /** Shorthand for a circle of this diameter. */
  circle?: number;
  style?: StyleProp<ViewStyle>;
};

/** A placeholder block with a sweeping highlight. Use inside a `SkeletonGroup`. */
export function Skeleton({ width = '100%', height = 14, radius, circle, style }: SkeletonProps) {
  const { colors, radius: radii } = useKinetikTheme();
  const shared = useContext(SweepContext);
  const own = useSweepClock(shared === null, 1400);
  const { clock, still } = shared ?? own;
  const { width: screen } = useWindowDimensions();
  const ref = useRef<View>(null);
  const pageX = useSharedValue(0);
  const remeasure = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (remeasure.current) clearTimeout(remeasure.current);
    },
    [],
  );

  // Measure on layout, and again once screen transitions have settled: a
  // measurement taken mid-transition includes the sliding screen's offset.
  const measure = () => {
    ref.current?.measureInWindow((x) => pageX.set(x));
    if (remeasure.current) clearTimeout(remeasure.current);
    remeasure.current = setTimeout(() => ref.current?.measureInWindow((x) => pageX.set(x)), 500);
  };

  const band = useAnimatedStyle(() => {
    // The band travels from off-screen left to off-screen right in screen space.
    const x = -BAND + clock.get() * (screen + BAND * 2) - pageX.get();
    return { transform: [{ translateX: x }] };
  });

  const size = circle
    ? { width: circle, height: circle, borderRadius: circle / 2 }
    : { width, height, borderRadius: radius ?? radii.sm };
  const light = colors.skeletonHighlight;

  return (
    <View
      ref={ref}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={measure}
      style={[styles.block, size, { backgroundColor: colors.skeleton }, style]}
    >
      {!still && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.band,
            gradient(
              `linear-gradient(90deg, ${withAlpha(light, 0)} 0%, ${light} 50%, ${withAlpha(light, 0)} 100%)`,
            ),
            band,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, width: BAND },
});
