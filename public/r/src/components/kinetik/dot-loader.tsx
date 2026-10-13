import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type DotLoaderVariant = 'wave' | 'pulse' | 'typing';

export type DotLoaderProps = {
  /** `wave` hops, `pulse` breathes, `typing` sits in a chat bubble. Defaults to `wave`. */
  variant?: DotLoaderVariant;
  /** Number of dots. Defaults to 3. */
  count?: number;
  /** Dot diameter. Defaults to 8. */
  size?: number;
  /** Dot colour. Defaults to the theme's muted text colour. */
  color?: string;
  /** One cycle, in ms. Defaults to 1100. */
  period?: number;
  /** Read by screen readers. Defaults to 'Loading'. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Dots that say something is on its way. In a wave they hop one after
 * another, in a pulse they swell and brighten, and as typing they sit in a
 * chat bubble. One clock drives every dot.
 */
export function DotLoader({
  variant = 'wave',
  count = 3,
  size = 8,
  color,
  period = 1100,
  accessibilityLabel = 'Loading',
  testID,
  style,
}: DotLoaderProps) {
  const { colors, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const clock = useSharedValue(0);
  const ink = color ?? colors.textMuted;

  useEffect(() => {
    clock.set(0);
    clock.set(withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [period, clock]);

  const dots = (
    <View
      style={[
        styles.row,
        { gap: size * 0.75, height: size * (variant === 'wave' && !reduced ? 2.2 : 1.6) },
      ]}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot
          key={i}
          index={i}
          count={count}
          size={size}
          color={ink}
          clock={clock}
          variant={variant}
          still={reduced}
        />
      ))}
    </View>
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {variant === 'typing' ? (
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.surfaceRaised,
              borderRadius: radius.lg,
              borderBottomLeftRadius: radius.xs,
              paddingHorizontal: size * 1.6,
              paddingVertical: size * 1.1,
            },
          ]}
        >
          {dots}
        </View>
      ) : (
        dots
      )}
    </View>
  );
}

type DotProps = {
  index: number;
  count: number;
  size: number;
  color: string;
  clock: SharedValue<number>;
  variant: DotLoaderVariant;
  /** Reduced motion: dots brighten in turn but do not move. */
  still: boolean;
};

function Dot({ index, count, size, color, clock, variant, still }: DotProps) {
  const style = useAnimatedStyle(() => {
    // Each dot runs a little behind the one before; the last third of the cycle is a rest.
    const phase = (clock.get() - index * (0.6 / Math.max(1, count)) + 1) % 1;
    const bump = phase < 0.6 ? Math.sin((phase / 0.6) * Math.PI) : 0;
    if (still) return { opacity: 0.35 + bump * 0.65, transform: [] };
    if (variant === 'pulse') {
      return { opacity: 0.35 + bump * 0.65, transform: [{ scale: 0.7 + bump * 0.45 }] };
    }
    const hop = variant === 'typing' ? 0.45 : 0.75;
    return {
      opacity: 0.45 + bump * 0.55,
      transform: [{ translateY: -bump * size * hop }],
    };
  });
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  bubble: { alignSelf: 'flex-start' },
});
