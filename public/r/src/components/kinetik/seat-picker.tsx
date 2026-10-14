import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
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
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type SeatPickerProps = {
  value: number;
  onChange: (value: number) => void;
  /** Seats that can be taken. Each one is drawn. Defaults to 5. */
  max?: number;
  /** Defaults to 1. */
  min?: number;
  /** Defaults to "Seats". */
  title?: string;
  /** A line above the action, e.g. "Add seats now and upgrade later if you need more." */
  caption?: string;
  /** A full-width button at the bottom, e.g. Upgrade. */
  action?: { label: string; onPress: () => void };
  /** Shows an info button next to the title. */
  onInfo?: () => void;
  /** Ticks on each change and a buzz at the limits. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Armchair from Tabler Icons (MIT, https://tabler.io/icons), on a 24 pt grid. */
const CHAIR = Skia.Path.MakeFromSVGString(
  'M5 11a2 2 0 0 1 2 2v2h10v-2a2 2 0 1 1 4 0v4a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2z M5 11v-5a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v5 M6 19v2 M18 19v2',
)!;

const SEAT = 34;
const GAP = 10;

/**
 * A seat counter: a row of armchairs that fill in as you add seats, a
 * stepper whose number rolls up or down, and a badge counting what is left.
 * New seats pop in, removed ones settle back, and pushing past a limit gives
 * the stepper a shake.
 */
export function SeatPicker({
  value,
  onChange,
  max = 5,
  min = 1,
  title = 'Seats',
  caption,
  action,
  onInfo,
  haptics = true,
  style,
}: SeatPickerProps) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const shake = useSharedValue(0);
  const bump = useSharedValue(0);
  // Which way the number rolls: up when it grows, down when it shrinks.
  const [last, setLast] = useState(value);
  const [rising, setRising] = useState(true);
  if (value !== last) {
    setRising(value > last);
    setLast(value);
  }
  const left = Math.max(0, max - value);

  useEffect(() => {
    if (!reduced) {
      bump.set(withSequence(withTiming(1, timing('quick')), withSpring(0, spring('bouncy'))));
    }
  }, [value, reduced, bump]);

  const change = (delta: number) => {
    const next = value + delta;
    if (next < min || next > max) {
      haptic('warning');
      if (!reduced) {
        shake.set(
          withSequence(
            withTiming(-6, { duration: 50 }),
            withTiming(6, { duration: 70 }),
            withTiming(-3, { duration: 60 }),
            withSpring(0, spring('snappy')),
          ),
        );
      }
      return;
    }
    haptic('tick');
    onChange(next);
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) =>
    change(e.nativeEvent.actionName === 'increment' ? 1 : -1);

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: 1 + bump.get() * 0.08 }] }));
  const full = left === 0;
  const tone = full ? colors.danger : colors.warning;

  return (
    <View style={style}>
      {/* The shadow is its own layer, so seats and numbers animating never redraw it. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius.xl, backgroundColor: colors.surfaceRaised, boxShadow: shadow.lg },
        ]}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.xl,
            padding: space[5],
            gap: space[5],
          },
        ]}
      >
        <View style={[styles.row, { gap: space[2] }]}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.medium }}
          >
            {title}
          </Text>
          <Animated.View
            accessible
            accessibilityLabel={
              full ? 'No seats left' : `${left} ${left === 1 ? 'seat' : 'seats'} left`
            }
            accessibilityLiveRegion="polite"
            style={[
              styles.badge,
              { backgroundColor: withAlpha(tone, 0.18), borderRadius: radius.sm, gap: 4 },
              badge,
            ]}
          >
            <Chair size={14} color={tone} />
            <Text style={{ color: tone, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
              {full ? 'Full' : `${left} left`}
            </Text>
          </Animated.View>
          <View style={styles.grow} />
          {onInfo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About seats"
              onPress={onInfo}
              hitSlop={10}
              style={styles.info}
            >
              <View style={[styles.infoRing, { borderColor: colors.textMuted }]}>
                <View style={[styles.infoDot, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.infoStem, { backgroundColor: colors.textMuted }]} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <Seats count={max} taken={value} />

        <Animated.View style={[styles.row, { gap: space[2] }, row]}>
          <StepButton kind="minus" disabled={value <= min} onPress={() => change(-1)} />
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={title}
            accessibilityValue={{
              min,
              max,
              now: value,
              text: `${value} ${value === 1 ? 'seat' : 'seats'}`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAccessibilityAction}
            style={styles.count}
          >
            <Animated.Text
              key={value}
              entering={
                reduced
                  ? undefined
                  : (rising ? FadeInDown : FadeInUp)
                      .duration(durations.base)
                      .easing(easings.standard)
              }
              exiting={
                reduced
                  ? undefined
                  : (rising ? FadeOutUp : FadeOutDown)
                      .duration(durations.quick)
                      .easing(easings.exit)
              }
              style={[
                styles.number,
                {
                  color: colors.text,
                  fontSize: font.size['3xl'],
                  fontWeight: font.weight.semibold,
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              {value}
            </Animated.Text>
          </View>
          <StepButton kind="plus" disabled={value >= max} onPress={() => change(1)} />
        </Animated.View>

        {caption || action ? (
          <View style={{ gap: space[3] }}>
            {caption ? (
              <Text
                style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}
              >
                {caption}
              </Text>
            ) : null}
            {action ? (
              <Pressable
                accessibilityRole="button"
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  {
                    borderColor: colors.borderStrong,
                    borderRadius: radius.pill,
                    backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.md,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** The row of armchairs, one canvas for all of them. */
function Seats({ count, taken }: { count: number; taken: number }) {
  const width = count * SEAT + (count - 1) * GAP;
  return (
    <View aria-hidden style={styles.seats}>
      <Canvas style={{ width, height: SEAT + 8 }}>
        {Array.from({ length: count }, (_, i) => (
          <Seat key={i} index={i} on={i < taken} />
        ))}
      </Canvas>
    </View>
  );
}

/** One armchair: fills and pops when taken, empties and sinks back when freed. */
function Seat({ index, on }: { index: number; on: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const fill = useSharedValue(on ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      fill.set(on ? 1 : 0);
      return;
    }
    fill.set(withTiming(on ? 1 : 0, timing('base')));
    scale.set(
      on
        ? withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, spring('bouncy')))
        : withSequence(withTiming(0.86, { duration: 110 }), withSpring(1, spring('smooth'))),
    );
  }, [on, reduced, fill, scale]);

  const empty = withAlpha(colors.text, 0.1);
  const color = useDerivedValue(() => interpolateColor(fill.get(), [0, 1], [empty, colors.text]));
  const transform = useDerivedValue(() => {
    const s = scale.get();
    const c = SEAT / 2;
    const x = index * (SEAT + GAP);
    return [
      { translateX: x + c },
      { translateY: 4 + c },
      { scale: s * (SEAT / 24) },
      { translateX: -12 },
      { translateY: -12 },
    ];
  });

  return (
    <Group transform={transform}>
      <Path path={CHAIR} color={color} />
      <Path
        path={CHAIR}
        color={color}
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        strokeJoin="round"
      />
    </Group>
  );
}

/** A small armchair for the badge. */
function Chair({ size, color }: { size: number; color: string }) {
  return (
    <View aria-hidden>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale: size / 24 }]}>
          <Path
            path={CHAIR}
            color={color}
            style="stroke"
            strokeWidth={2.2}
            strokeCap="round"
            strokeJoin="round"
          />
        </Group>
      </Canvas>
    </View>
  );
}

function StepButton({
  kind,
  disabled,
  onPress,
}: {
  kind: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.05 }] }));
  const ink = disabled ? colors.textSubtle : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kind === 'plus' ? 'Add a seat' : 'Remove a seat'}
      accessibilityState={{ disabled }}
      onPress={onPress}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      style={styles.grow}
    >
      <Animated.View
        style={[
          styles.step,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.pill,
            boxShadow: shadow.sm,
          },
          style,
        ]}
      >
        <View style={[styles.glyph, { borderColor: ink }]}>
          <View style={[styles.bar, { backgroundColor: ink }]} />
          {kind === 'plus' ? (
            <View style={[styles.bar, styles.upright, { backgroundColor: ink }]} />
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  info: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  infoRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    paddingTop: 4,
    gap: 2,
  },
  infoDot: { width: 2.5, height: 2.5, borderRadius: 1.25 },
  infoStem: { width: 2, height: 6, borderRadius: 1 },
  seats: { alignSelf: 'center' },
  count: {
    width: 56,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  number: { position: 'absolute' },
  step: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { position: 'absolute', width: 10, height: 2, borderRadius: 1 },
  upright: { transform: [{ rotate: '90deg' }] },
  action: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
