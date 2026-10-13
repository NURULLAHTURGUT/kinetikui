import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget } from '../../lib/kinetik/tokens/tokens';

export type RollStepperProps = {
  value: number;
  onValueChange: (value: number) => void;
  /** Defaults to 0. */
  min?: number;
  /** Defaults to 99. */
  max?: number;
  /** Defaults to 1. */
  step?: number;
  /** Names the stepper for screen readers, e.g. "Guests". */
  label: string;
  /** Formats the value, e.g. `(v) => \`${v} nights\``. */
  formatValue?: (value: number) => string;
  /** Keep stepping while a button is held, faster the longer it is held. Defaults to true. */
  repeat?: boolean;
  /** A tick on each step and a bump at the limits. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 48;
/** Hold this long before repeating, then repeat ever faster down to the floor. */
const HOLD_MS = 380;
const FIRST_MS = 140;
const FLOOR_MS = 45;

/**
 * A number stepper whose value rolls: up from below when it grows, down from
 * above when it shrinks. Holding a button keeps it rolling and speeds it up;
 * at a limit the figure bumps against the end instead.
 */
export function RollStepper({
  value,
  onValueChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  formatValue = (v) => String(v),
  repeat = true,
  haptics = true,
  disabled = false,
  testID,
  style,
}: RollStepperProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);

  // The figure on its way out, the direction of travel and a counter that restarts the roll.
  const [roll, setRoll] = useState({ from: value, to: value, dir: 1, id: 0 });
  if (roll.to !== value) {
    setRoll({ from: roll.to, to: value, dir: value > roll.to ? 1 : -1, id: roll.id + 1 });
  }
  const t = useSharedValue(1);
  const bump = useSharedValue(0);
  // The latest value for steps fired from a held button, between renders.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    if (roll.id === 0) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('snappy')));
  }, [roll.id, reduced, t]);

  const nudge = (dir: number) => {
    haptic('thud');
    if (reduced) return;
    bump.set(withSequence(withTiming(dir * 5, { duration: 70 }), withSpring(0, spring('bouncy'))));
  };

  const stepBy = (dir: 1 | -1) => {
    const current = latest.current;
    const next = Math.min(max, Math.max(min, current + dir * step));
    // Round away float drift from fractional steps.
    const clean = Number(next.toFixed(6));
    if (clean === current) {
      nudge(dir);
      return false;
    }
    latest.current = clean;
    haptic('tick');
    onValueChange(clean);
    return true;
  };

  // Hold to repeat: a pause, then steps that come faster and faster.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeated = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const start = (dir: 1 | -1) => {
    repeated.current = false;
    if (!repeat) return;
    let delay = FIRST_MS;
    const tick = () => {
      repeated.current = true;
      if (!stepBy(dir)) return stop();
      delay = Math.max(FLOOR_MS, delay * 0.86);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, HOLD_MS);
  };

  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateY: -roll.dir * t.get() * HEIGHT * 0.55 }, { scale: 1 - t.get() * 0.2 }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [
      { translateY: roll.dir * (1 - t.get()) * HEIGHT * 0.55 },
      { scale: 0.8 + t.get() * 0.2 },
    ],
  }));
  const figure = useAnimatedStyle(() => ({ transform: [{ translateX: bump.get() }] }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    stepBy(e.nativeEvent.actionName === 'increment' ? 1 : -1);
  };

  const button = (dir: 1 | -1) => {
    const atLimit = dir === 1 ? value >= max : value <= min;
    return (
      <Pressable
        // Left undefined when enabled, so Pressable keeps the limit in accessibilityState;
        // a press at the limit still bumps the figure.
        disabled={disabled || undefined}
        onPressIn={() => start(dir)}
        onPressOut={stop}
        onPress={() => {
          if (!repeated.current) stepBy(dir);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${dir === 1 ? 'Increase' : 'Decrease'} ${label}`}
        accessibilityState={{ disabled: disabled || atLimit }}
        style={({ pressed }) => [
          styles.button,
          {
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised,
            opacity: atLimit ? 0.35 : 1,
            transform: [{ scale: pressed && !reduced ? 0.92 : 1 }],
          },
        ]}
      >
        <View style={[styles.bar, { backgroundColor: colors.text }]} />
        {dir === 1 ? (
          <View style={[styles.bar, styles.vertical, { backgroundColor: colors.text }]} />
        ) : null}
      </Pressable>
    );
  };

  const text = { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.semibold };
  const widest = [formatValue(min), formatValue(max), formatValue(value)].reduce((a, b) =>
    b.length > a.length ? b : a,
  );

  return (
    <View
      testID={testID}
      style={[
        styles.shell,
        {
          borderRadius: radius.pill,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: space[2],
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {button(-1)}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={styles.window}
      >
        {/* Sizes the window to the widest figure, so the buttons never shift. */}
        <Text style={[text, styles.tabular, styles.sizer]} importantForAccessibility="no">
          {widest}
        </Text>
        <Animated.View style={[StyleSheet.absoluteFill, figure]}>
          {roll.from !== roll.to ? (
            <Animated.Text
              key={`out-${roll.id}`}
              numberOfLines={1}
              style={[styles.figure, text, styles.tabular, outgoing]}
            >
              {formatValue(roll.from)}
            </Animated.Text>
          ) : null}
          <Animated.Text
            key={`in-${roll.id}`}
            numberOfLines={1}
            style={[styles.figure, text, styles.tabular, incoming]}
          >
            {formatValue(roll.to)}
          </Animated.Text>
        </Animated.View>
      </View>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { width: 14, height: 2, borderRadius: 1 },
  vertical: { position: 'absolute', transform: [{ rotate: '90deg' }] },
  window: { minWidth: 64, height: HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  sizer: { opacity: 0, paddingHorizontal: 8, textAlign: 'center' },
  figure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: HEIGHT,
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
