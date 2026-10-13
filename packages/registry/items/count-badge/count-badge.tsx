import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type CountBadgeProps = {
  count: number;
  /** What sits under the badge: an icon, an avatar, a tab. */
  children: ReactNode;
  /** Above this the badge shows "99+". Defaults to 99. */
  max?: number;
  /** A plain dot instead of a number. */
  dot?: boolean;
  /** Defaults to "danger". */
  tone?: 'danger' | 'azure';
  /** Read by screen readers, e.g. (n) => `${n} unread`. Defaults to "n new". */
  formatLabel?: (count: number) => string;
  /** The colour around the badge that cuts it out from what is under it. Defaults to the theme background. */
  ringColor?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const H = 20;

/** The text a badge shows for a count. */
export function badgeText(count: number, max = 99): string {
  return count > max ? `${max}+` : String(Math.max(0, count));
}

/**
 * A count on the corner of an icon or avatar. It springs out of nothing for
 * the first item, gives a small jump each time the count goes up while the
 * number rolls upwards (downwards when it falls), and shrinks away at zero.
 */
export function CountBadge({
  count,
  children,
  max = 99,
  dot = false,
  tone = 'danger',
  formatLabel = (n) => `${n} new`,
  ringColor,
  testID,
  style,
}: CountBadgeProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const visible = count > 0;
  const text = badgeText(count, max);

  const [roll, setRoll] = useState({ count, text, prev: text, dir: 1, n: 0 });
  if (roll.count !== count) {
    setRoll({ count, text, prev: roll.text, dir: count > roll.count ? 1 : -1, n: roll.n + 1 });
  }

  const shown = useSharedValue(visible ? 1 : 0);
  const jump = useSharedValue(1);
  const p = useSharedValue(1);
  useEffect(() => {
    shown.set(
      visible
        ? withSpring(1, spring('bouncy', reduced))
        : withTiming(0, { duration: durations.quick, easing: easings.exit }),
    );
  }, [visible, reduced, shown]);
  useEffect(() => {
    if (roll.n === 0 || reduced) return;
    p.set(0);
    p.set(withTiming(1, { duration: durations.base, easing: easings.standard }));
    if (roll.dir > 0) {
      jump.set(withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, spring('bouncy'))));
    }
  }, [roll.n, roll.dir, reduced, p, jump]);

  const badge = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.get() * 2),
    transform: [{ scale: Math.max(0, shown.get()) * jump.get() }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 10 * roll.dir }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - p.get(),
    transform: [{ translateY: -p.get() * 10 * roll.dir }],
  }));

  const fill = tone === 'danger' ? colors.danger : colors.azure;
  const number = {
    // Dark ink on the light red of the dark theme, white on the deep red of the light one.
    color: tone === 'danger' ? colors.onEmber : colors.onAzure,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    fontVariant: ['tabular-nums' as const],
  };

  return (
    <View testID={testID} style={[styles.root, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessible={visible}
        accessibilityLabel={visible ? formatLabel(count) : undefined}
        importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
        style={[
          dot ? styles.dot : styles.badge,
          { backgroundColor: fill, borderColor: ringColor ?? colors.background },
          badge,
        ]}
      >
        {dot ? null : (
          <View style={styles.window}>
            {roll.prev !== roll.text ? (
              <Animated.Text style={[number, styles.ghost, outgoing]}>{roll.prev}</Animated.Text>
            ) : null}
            <Animated.Text style={[number, incoming]}>{text}</Animated.Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: H + 4,
    height: H + 4,
    borderRadius: (H + 4) / 2,
    borderWidth: 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  window: { height: H - 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute' },
});
