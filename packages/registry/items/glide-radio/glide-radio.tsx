import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type GlideRadioOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type GlideRadioProps = {
  options: readonly GlideRadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Names the group for screen readers, e.g. "Notifications". */
  accessibilityLabel: string;
  /** A tick when the choice changes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const RING = 22;
const DOT = 10;
const ROW = 48;

/**
 * A radio group with a single dot that travels. Choosing another option sends
 * the dot down (or up) the column of rings like a drop of ink: its front
 * races ahead, the back catches up, and it settles round in the new ring.
 */
export function GlideRadio({
  options,
  value,
  onValueChange,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: GlideRadioProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [centers, setCenters] = useState<Record<string, number>>({});
  const lead = useSharedValue(0);
  const tail = useSharedValue(0);
  const placed = useRef(false);
  const target = centers[value];

  useEffect(() => {
    if (target === undefined) return;
    // The first placement is instant; after that the dot travels.
    if (reduced || !placed.current) {
      lead.set(target);
      tail.set(target);
    } else {
      lead.set(withSpring(target, spring('snappy')));
      tail.set(withSpring(target, spring('smooth')));
    }
    placed.current = true;
  }, [target, reduced, lead, tail]);

  const drop = useAnimatedStyle(() => {
    const a = lead.get();
    const b = tail.get();
    const stretch = Math.abs(a - b);
    return {
      opacity: target === undefined ? 0 : 1,
      top: Math.min(a, b) - DOT / 2,
      height: DOT + stretch,
      // A long drop thins a little, like ink pulled along.
      transform: [{ scaleX: 1 - Math.min(0.3, stretch / 120) }],
    };
  });

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
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
            disabled={option.disabled}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              const c = y + height / 2;
              setCenters((m) => (m[option.value] === c ? m : { ...m, [option.value]: c }));
            }}
            accessibilityRole="radio"
            accessibilityLabel={[option.label, option.description].filter(Boolean).join(', ')}
            accessibilityState={{ checked: selected, disabled: option.disabled }}
            style={[styles.row, { opacity: option.disabled ? 0.4 : 1 }]}
          >
            <View
              style={[styles.ring, { borderColor: selected ? colors.azure : colors.borderStrong }]}
            />
            <Label option={option} selected={selected} />
          </Pressable>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[styles.drop, { backgroundColor: colors.azure }, drop]}
      />
    </View>
  );
}

function Label({ option, selected }: { option: GlideRadioOption; selected: boolean }) {
  const { colors, font } = useKinetikTheme();
  return (
    <View style={styles.text}>
      <Text
        style={{
          color: colors.text,
          fontSize: font.size.md,
          fontWeight: selected ? font.weight.semibold : font.weight.regular,
        }}
      >
        {option.label}
      </Text>
      {option.description ? (
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {option.description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: ROW, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  ring: { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2 },
  text: { flex: 1, gap: 1 },
  drop: {
    position: 'absolute',
    left: (RING - DOT) / 2,
    width: DOT,
    borderRadius: DOT / 2,
  },
});
