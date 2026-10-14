import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type PickerPlan = {
  id: string;
  title: string;
  /** Line under the title, e.g. "14-day free trial". */
  note?: string;
  /** Price per month, shown large. */
  monthly: string;
  /** What is billed, shown small under the monthly price, e.g. "89.98/yr". */
  billed?: string;
};

export type PlanPickerProps = {
  plans: readonly PickerPlan[];
  value: string;
  onChange: (id: string) => void;
  /** A reassurance line under the plans. */
  footnote?: string;
  /** The button under the tray. */
  cta?: { label: string; onPress: () => void };
  /** A tick when the plan changes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** An italic serif for plan names; each platform's own. */
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

/**
 * Plan cards resting in a tray: the picked one lifts towards you, its check
 * pops in and the others settle back. Under it, a button whose chevrons
 * stream in towards the label.
 */
export function PlanPicker({
  plans,
  value,
  onChange,
  footnote,
  cta,
  haptics = true,
  style,
}: PlanPickerProps) {
  const { colors, radius, space, font } = useKinetikTheme();
  const haptic = useHaptic(haptics);
  return (
    <View style={[{ gap: space[5] }, style]}>
      <View
        accessibilityRole="radiogroup"
        style={[
          styles.tray,
          { backgroundColor: colors.surfaceSunken, borderRadius: radius.xl, gap: 6 },
        ]}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            on={plan.id === value}
            onPress={() => {
              if (plan.id === value) return;
              haptic('tick');
              onChange(plan.id);
            }}
          />
        ))}
        {footnote ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.sm,
              textAlign: 'center',
              paddingVertical: space[3],
            }}
          >
            {footnote}
          </Text>
        ) : null}
      </View>
      {cta ? <StreamButton label={cta.label} onPress={cta.onPress} /> : null}
    </View>
  );
}

function PlanCard({ plan, on, onPress }: { plan: PickerPlan; on: boolean; onPress: () => void }) {
  const { colors, radius, space, font, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const lift = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    lift.set(reduced ? (on ? 1 : 0) : withSpring(on ? 1 : 0, spring('bouncy')));
  }, [on, reduced, lift]);

  const card = useAnimatedStyle(() => ({
    opacity: 0.82 + lift.get() * 0.18,
    transform: [{ scale: 0.985 + lift.get() * 0.015 }, { translateY: -lift.get() * 1.5 }],
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[plan.title, plan.note, `${plan.monthly} per month`, plan.billed]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ checked: on }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: space[5],
            gap: space[4],
            boxShadow: on ? shadow.md : shadow.sm,
          },
          card,
        ]}
      >
        <Check on={on} />
        <View style={styles.grow}>
          <Text
            style={{
              color: colors.text,
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: font.size.xl + 2,
            }}
          >
            {plan.title}
          </Text>
          {plan.note ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.md, marginTop: 2 }}>
              {plan.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.price}>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {plan.monthly}/mo
          </Text>
          {plan.billed ? (
            <Text style={{ color: colors.textSubtle, fontSize: font.size.md, marginTop: 2 }}>
              {plan.billed}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** A filled circle with a tick that draws in, or an empty dimple. */
function Check({ on }: { on: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const fill = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      fill.set(on ? 1 : 0);
      return;
    }
    fill.set(
      on
        ? withSequence(withTiming(0, { duration: 0 }), withSpring(1, spring('bouncy')))
        : withTiming(0, timing('quick')),
    );
  }, [on, reduced, fill]);

  const dot = useAnimatedStyle(() => ({
    opacity: Math.min(1, fill.get() * 2),
    transform: [{ scale: interpolate(fill.get(), [0, 1], [0.4, 1]) }],
  }));
  const tick = useAnimatedStyle(() => ({
    opacity: interpolate(fill.get(), [0.5, 1], [0, 1], 'clamp'),
    transform: [
      { rotate: '-45deg' },
      { scale: interpolate(fill.get(), [0.5, 1], [0.4, 1], 'clamp') },
    ],
  }));

  return (
    <View style={[styles.radio, { backgroundColor: colors.track }]}>
      <Animated.View style={[styles.radioFill, { backgroundColor: colors.ember }, dot]}>
        <Animated.View style={[styles.tick, { borderColor: colors.onEmber }, tick]} />
      </Animated.View>
    </View>
  );
}

/** A dark pill whose chevrons stream in from both sides towards the label. */
function StreamButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, radius, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const wave = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    wave.set(reduced ? 0 : withRepeat(withTiming(1, { duration: 1400 }), -1));
  }, [reduced, wave]);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.02 }] }));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
    >
      <Animated.View
        style={[styles.cta, { backgroundColor: colors.ember, borderRadius: radius.xl }, body]}
      >
        <Chevrons wave={wave} press={press} side="left" still={reduced} />
        <Text
          style={{
            color: colors.onEmber,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
          }}
        >
          {label}
        </Text>
        <Chevrons wave={wave} press={press} side="right" still={reduced} />
      </Animated.View>
    </Pressable>
  );
}

function Chevrons({
  wave,
  press,
  side,
  still,
}: {
  wave: SharedValue<number>;
  press: SharedValue<number>;
  side: 'left' | 'right';
  still: boolean;
}) {
  return (
    <View aria-hidden style={[styles.chevrons, side === 'right' && styles.flip]}>
      {[0, 1, 2].map((i) => (
        <Chevron key={i} index={i} wave={wave} press={press} still={still} />
      ))}
    </View>
  );
}

/** One ">" that brightens as the wave passes, outer to inner. */
function Chevron({
  index,
  wave,
  press,
  still,
}: {
  index: number;
  wave: SharedValue<number>;
  press: SharedValue<number>;
  still: boolean;
}) {
  const { colors } = useKinetikTheme();
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 0.3 + index * 0.25 };
    // Each chevron peaks a third of a cycle after the one outside it.
    const phase = (wave.get() - index / 3 + 1) % 1;
    const glow = Math.max(0, 1 - Math.abs(phase - 0.5) * 3);
    return {
      opacity: 0.25 + glow * 0.75,
      transform: [{ translateX: press.get() * 4 + glow * 2 }],
    };
  });
  // The animated wrapper moves it; the inner view keeps its own 45° turn.
  return (
    <Animated.View style={style}>
      <View style={[styles.chevron, { borderColor: colors.onEmber }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tray: { padding: 6 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1 },
  price: { alignItems: 'flex-end' },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 12, height: 7, marginTop: -3, borderLeftWidth: 2.5, borderBottomWidth: 2.5 },
  cta: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    minWidth: minTouchTarget,
  },
  chevrons: { flexDirection: 'row', gap: 1 },
  flip: { transform: [{ scaleX: -1 }] },
  chevron: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
