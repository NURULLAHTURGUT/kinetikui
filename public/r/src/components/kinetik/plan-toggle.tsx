import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
  type StyleProp,
  type TextStyle,
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

export type PlanToggleOption = {
  value: string;
  label: string;
  /** A small tag after the label, e.g. "Save 20%". It pops when its option is picked. */
  badge?: string;
};

export type PlanToggleProps = {
  /** Two or three billing periods or plan kinds. */
  options: readonly PlanToggleOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Names the toggle, e.g. "Billing period". */
  accessibilityLabel: string;
  /** A tick on change. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD = 4;

/**
 * A billing-period toggle. The thumb slides and resizes to the picked
 * option, and an option's savings badge pops as it is chosen. Pair it with
 * `PlanPrice`, whose figure rolls to the new amount.
 */
export function PlanToggle({
  options,
  value,
  onValueChange,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: PlanToggleProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const placed = useRef(false);
  const target = layouts[value];

  useEffect(() => {
    if (!target) return;
    const snap = reduced || !placed.current;
    placed.current = true;
    x.set(snap ? target.x : withSpring(target.x, spring('smooth')));
    w.set(snap ? target.width : withSpring(target.width, spring('smooth')));
  }, [target, reduced, x, w]);

  const thumb = useAnimatedStyle(() => ({
    opacity: w.get() > 0 ? 1 : 0,
    width: w.get(),
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.border,
          borderRadius: radius.pill,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.pill,
            borderColor: colors.border,
          },
          thumb,
        ]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptic('tick');
              onValueChange(option.value);
            }}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setLayouts((l) => {
                const prev = l[option.value];
                return prev && prev.x === layout.x && prev.width === layout.width
                  ? l
                  : { ...l, [option.value]: layout };
              });
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.badge ? `${option.label}, ${option.badge}` : option.label}
            accessibilityState={{ checked: selected }}
            style={styles.option}
          >
            <Text
              style={{
                color: selected ? colors.text : colors.textMuted,
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
              }}
            >
              {option.label}
            </Text>
            {option.badge ? (
              <Badge text={option.badge} active={selected} reduced={reduced} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Badge({ text, active, reduced }: { text: string; active: boolean; reduced: boolean }) {
  const { colors, font, radius } = useKinetikTheme();
  const pop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!active || reduced) return;
    pop.set(withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, spring('bouncy'))));
  }, [active, reduced, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: active ? colors.azure : colors.azureSoft,
          borderRadius: radius.pill,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: active ? colors.onAzure : colors.azure,
          fontSize: font.size.xs - 1,
          fontWeight: font.weight.bold,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

export type PlanPriceProps = {
  amount: number;
  /** Formats the amount. Defaults to whole dollars, e.g. "$12". */
  format?: (amount: number) => string;
  /** After the figure, e.g. "/ month". */
  suffix?: string;
  /** Style for the figure. */
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

/**
 * A price that rolls to its new amount: up from below when it rises, down
 * from above when it falls, with the suffix crossfading beside it.
 */
export function PlanPrice({
  amount,
  format = (a) => `$${Math.round(a)}`,
  suffix,
  textStyle,
  style,
}: PlanPriceProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [roll, setRoll] = useState({ from: amount, to: amount, id: 0 });
  if (roll.to !== amount) setRoll({ from: roll.to, to: amount, id: roll.id + 1 });
  const t = useSharedValue(1);
  useEffect(() => {
    if (roll.id === 0) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [roll.id, reduced, t]);

  const dir = roll.to >= roll.from ? 1 : -1;
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateY: -dir * t.get() * 22 }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: dir * (1 - t.get()) * 22 }],
  }));

  const figure: StyleProp<TextStyle> = [
    {
      color: colors.text,
      fontSize: font.size['4xl'],
      fontWeight: font.weight.bold,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    textStyle,
  ];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${format(amount)}${suffix ? ` ${suffix}` : ''}`}
      style={[styles.price, style]}
    >
      <View style={styles.figureBox}>
        {/* Holds the line height and width of the current figure. */}
        <Text style={[figure, styles.ghost]}>{format(roll.to)}</Text>
        {roll.from !== roll.to ? (
          <Animated.Text key={`o${roll.id}`} style={[figure, styles.layer, outgoing]}>
            {format(roll.from)}
          </Animated.Text>
        ) : null}
        <Animated.Text key={`i${roll.id}`} style={[figure, styles.layer, incoming]}>
          {format(roll.to)}
        </Animated.Text>
      </View>
      {suffix ? (
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, marginLeft: 6 }}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    minHeight: minTouchTarget,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: { paddingHorizontal: 7, paddingVertical: 2 },
  price: { flexDirection: 'row', alignItems: 'baseline' },
  figureBox: { overflow: 'hidden' },
  ghost: { opacity: 0 },
  layer: { position: 'absolute', left: 0, top: 0 },
});
