import { Canvas, Circle, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type LikeBurstProps = {
  /** Controlled state. Leave unset to let the button keep its own. */
  liked?: boolean;
  /** Initial state when uncontrolled. Defaults to false. */
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  /**
   * Likes from everyone else. The viewer's own like is added on top, so the
   * number moves the moment they tap. Leave unset to hide the count.
   */
  count?: number;
  formatCount?: (count: number) => string;
  /** Heart colour once liked. Defaults to the theme danger red. */
  color?: string;
  /** Heart size. Defaults to 26. */
  size?: number;
  /** Defaults to 'Like'. */
  accessibilityLabel?: string;
  /** A light tap on like. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  countStyle?: StyleProp<TextStyle>;
};

/** Sparks around the heart: angle in degrees, and whether it is a large one. */
const SPARKS = Array.from({ length: 10 }, (_, i) => ({
  angle: -90 + i * 36 + (i % 2 ? 10 : 0),
  large: i % 2 === 0,
}));

/** A heart on a 24 pt grid, drawn once. */
const HEART = Skia.Path.MakeFromSVGString(
  'M12 20.3C11.7 20.3 11.4 20.2 11.2 20C7.4 16.7 3 13.1 3 8.9C3 6.2 5.1 4 7.8 4C9.5 4 11 4.8 12 6.1C13 4.8 14.5 4 16.2 4C18.9 4 21 6.2 21 8.9C21 13.1 16.6 16.7 12.8 20C12.6 20.2 12.3 20.3 12 20.3Z',
)!;

/** Compact counts: 980, 1.2K, 24K, 3.1M. */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const [d, s] = n < 1_000_000 ? [1000, 'K'] : [1_000_000, 'M'];
  const v = n / d;
  return `${v < 10 ? Math.floor(v * 10) / 10 : Math.floor(v)}${s}`;
}

/**
 * A like button that celebrates: the heart dips, then pops full with a ring
 * of light and a spray of sparks, and the count rolls to its new number.
 * Unliking is quiet: the heart just empties.
 */
export function LikeBurst({
  liked,
  defaultLiked = false,
  onLikedChange,
  count,
  formatCount = compactCount,
  color,
  size = 26,
  accessibilityLabel = 'Like',
  haptics = true,
  disabled = false,
  testID,
  style,
  countStyle,
}: LikeBurstProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [inner, setInner] = useState(defaultLiked);
  const on = liked ?? inner;
  const accent = color ?? colors.danger;

  // The canvas leaves room around the heart for the burst.
  const box = size * 2.2;
  const unit = size / 24;
  const c = box / 2;

  const fill = useSharedValue(on ? 1 : 0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(1);
  const pressed = useSharedValue(0);

  // Only a change made here celebrates; a like that arrives from the parent just fills.
  const celebrate = useRef(false);
  useEffect(() => {
    const play = celebrate.current && on && !reduced;
    celebrate.current = false;
    fill.set(withTiming(on ? 1 : 0, timing(on ? 'quick' : 'base', reduced)));
    if (!play) return;
    pop.set(withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, spring('bouncy'))));
    burst.set(0);
    burst.set(withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [on, reduced, fill, pop, burst]);

  const toggle = () => {
    const next = !on;
    celebrate.current = true;
    if (liked === undefined) setInner(next);
    if (next) haptic('tap');
    onLikedChange?.(next);
  };

  const heart = useDerivedValue(() => [
    { translateX: c - 12 * unit * pop.get() },
    { translateY: c - 12 * unit * pop.get() },
    { scale: unit * pop.get() },
  ]);
  const outline = useDerivedValue(() => 1 - fill.get());
  // The ring opens fast and thins to nothing; sparks fly out a little behind it.
  const ringR = useDerivedValue(() => size * (0.25 + burst.get() * 0.75));
  const ringW = useDerivedValue(() => Math.max(0, (1 - burst.get()) * size * 0.32));
  const ringO = useDerivedValue(() => (burst.get() < 1 ? 1 : 0));

  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.08 }],
  }));

  const total = count === undefined ? undefined : count + (on ? 1 : 0);
  const slop = Math.max(0, (minTouchTarget - box) / 2);

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={toggle}
      onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
      hitSlop={slop}
      accessibilityRole="togglebutton"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on, disabled }}
      accessibilityValue={total === undefined ? undefined : { text: formatCount(total) }}
      style={[styles.row, { opacity: disabled ? 0.45 : 1, minHeight: minTouchTarget }, style]}
    >
      <Animated.View style={[{ width: box, height: box, margin: -size * 0.35 }, shell]}>
        {/* Wrapped: the web canvas ignores pointerEvents and would swallow the press. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Circle
              c={vec(c, c)}
              r={ringR}
              style="stroke"
              strokeWidth={ringW}
              color={withAlpha(accent, 0.55)}
              opacity={ringO}
            />
            {SPARKS.map((s, i) => (
              <Spark
                key={i}
                center={c}
                angle={s.angle}
                reach={size * (s.large ? 0.95 : 0.78)}
                dot={size * (s.large ? 0.09 : 0.06)}
                color={s.large ? accent : colors.sky}
                burst={burst}
              />
            ))}
            <Group transform={heart}>
              <Path
                path={HEART}
                style="stroke"
                strokeWidth={1.9}
                strokeJoin="round"
                color={colors.textMuted}
                opacity={outline}
              />
              <Path path={HEART} color={accent} opacity={fill} />
            </Group>
          </Canvas>
        </View>
      </Animated.View>
      {total !== undefined ? (
        <Roll
          text={formatCount(total)}
          up={on}
          reduced={reduced}
          style={[
            {
              color: on ? accent : colors.textMuted,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            },
            countStyle,
          ]}
        />
      ) : null}
    </Pressable>
  );
}

function Spark({
  center,
  angle,
  reach,
  dot,
  color,
  burst,
}: {
  center: number;
  angle: number;
  reach: number;
  dot: number;
  color: string;
  burst: SharedValue<number>;
}) {
  const rad = (angle * Math.PI) / 180;
  const at = useDerivedValue(() => {
    // Sparks leave once the ring has opened a little.
    const t = Math.max(0, (burst.get() - 0.15) / 0.85);
    const d = reach * (0.55 + t * 0.45);
    return vec(center + Math.cos(rad) * d, center + Math.sin(rad) * d);
  });
  const r = useDerivedValue(() => {
    const t = burst.get();
    return t <= 0.15 || t >= 1 ? 0 : dot * (1 - (t - 0.15) / 0.85);
  });
  return <Circle c={at} r={r} color={color} />;
}

/** The count: the old number slides out as the new one slides in. */
function Roll({
  text,
  up,
  reduced,
  style,
}: {
  text: string;
  up: boolean;
  reduced: boolean;
  style: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState({ now: text, was: text });
  const t = useSharedValue(1);
  const dir = up ? 1 : -1;

  if (shown.now !== text) setShown({ now: text, was: shown.now });

  useEffect(() => {
    if (shown.now === shown.was) return;
    t.set(0);
    t.set(withTiming(1, timing('base', reduced)));
  }, [shown, reduced, t]);

  const incoming = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * 10 * dir }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateY: -t.get() * 10 * dir }],
  }));

  return (
    <View
      style={styles.roll}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.Text style={[style, styles.digits, incoming]}>{shown.now}</Animated.Text>
      {shown.was !== shown.now ? (
        <Animated.Text style={[style, styles.digits, styles.stacked, outgoing]}>
          {shown.was}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  roll: { overflow: 'hidden', paddingVertical: 2 },
  digits: { fontVariant: ['tabular-nums'] },
  stacked: { position: 'absolute', top: 2, left: 0 },
});
