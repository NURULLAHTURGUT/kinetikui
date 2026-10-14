import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
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
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentBarAction = {
  icon: ReactNode;
  /** Accessible name, e.g. "Save image". */
  label: string;
  onPress: () => void;
};

export type SegmentBarProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "File format". */
  label: string;
  /** A round button after the segments, e.g. save or erase. It pops when pressed. */
  action?: SegmentBarAction;
  disabled?: boolean;
  /** A tick when the selection changes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

type Slot = { x: number; width: number };

/**
 * A segmented control in a rounded panel: a soft pill glides to the option
 * you pick and settles with a little give, labels brighten as it arrives, and
 * an optional button at the end pops when pressed.
 */
export function SegmentBar<T extends string>({
  options,
  value,
  onChange,
  label,
  action,
  disabled = false,
  haptics = true,
  style,
}: SegmentBarProps<T>) {
  const { colors, radius, space, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const slots = useRef<Record<string, Slot>>({});
  const [measured, setMeasured] = useState(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    const slot = slots.current[value];
    if (!slot) return;
    // The first placement jumps; later ones glide.
    if (!placed.current || reduced) {
      x.set(slot.x);
      w.set(slot.width);
      placed.current = true;
      return;
    }
    x.set(withSpring(slot.x, spring('smooth')));
    w.set(withSpring(slot.width, spring('smooth')));
  }, [value, measured, reduced, x, w]);

  const onSlotLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: sx, width } = e.nativeEvent.layout;
    slots.current[key] = { x: sx, width };
    setMeasured((m) => m + 1);
  };

  const pill = useAnimatedStyle(() => ({
    width: w.get(),
    transform: [{ translateX: x.get() }],
    opacity: w.get() > 0 ? 1 : 0,
  }));

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          paddingLeft: space[2],
          paddingRight: action ? space[1] : space[2],
          gap: space[2],
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.group, { backgroundColor: colors.surface, borderRadius: radius.md }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            { backgroundColor: withAlpha(colors.text, 0.14), borderRadius: radius.sm },
            pill,
          ]}
        />
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ checked: on, disabled }}
              disabled={disabled}
              onLayout={onSlotLayout(o.value)}
              onPress={() => {
                if (on) return;
                haptic('tick');
                onChange(o.value);
              }}
              style={styles.option}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: on ? colors.text : colors.textMuted,
                  fontSize: font.size.sm,
                  fontWeight: on ? font.weight.semibold : font.weight.medium,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {action ? <PopButton action={action} disabled={disabled} /> : null}
    </View>
  );
}

function PopButton({ action, disabled }: { action: SegmentBarAction; disabled: boolean }) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: pop.get() * 3 }, { scale: 1 - pop.get() * 0.14 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      disabled={disabled}
      onPress={() => {
        if (!reduced) {
          pop.set(withSequence(withTiming(1, timing('quick')), withSpring(0, spring('bouncy'))));
        }
        action.onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? withAlpha(colors.text, 0.06) : 'transparent' },
      ]}
    >
      <Animated.View style={style}>{action.icon}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  group: { flex: 1, flexDirection: 'row', padding: 3 },
  pill: { position: 'absolute', top: 3, bottom: 3, left: 0 },
  option: {
    flex: 1,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  action: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
