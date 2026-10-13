import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type ChoiceCardOption = {
  value: string;
  title: string;
  description?: string;
  /** Right-hand detail, such as a price. */
  detail?: string;
  /** A small label beside the title, e.g. "Popular". */
  badge?: string;
  disabled?: boolean;
};

export type ChoiceCardsProps = {
  options: readonly ChoiceCardOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Names the group for screen readers, e.g. "Delivery speed". */
  accessibilityLabel: string;
  /** A tick when the choice changes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const GAP = 10;
const RING = 2;

/**
 * Option cards for a single choice. One selection ring glides from card to
 * card and stretches to each card's height on the way, while the radio dot
 * inside the new card fills.
 */
export function ChoiceCards({
  options,
  value,
  onValueChange,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: ChoiceCardsProps) {
  const { colors, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const top = useSharedValue(0);
  const height = useSharedValue(0);
  const placed = useRef(false);
  const target = layouts[value];

  useEffect(() => {
    if (!target) return;
    // The first placement is instant; after that the ring travels.
    const snap = reduced || !placed.current;
    placed.current = true;
    top.set(snap ? target.y : withSpring(target.y, spring('smooth')));
    height.set(snap ? target.height : withSpring(target.height, spring('smooth')));
  }, [target, reduced, top, height]);

  const ring = useAnimatedStyle(() => ({
    opacity: height.get() > 0 ? 1 : 0,
    top: top.get() - RING / 2,
    height: height.get() + RING,
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[{ gap: GAP }, style]}
    >
      {options.map((option) => (
        <Card
          key={option.value}
          option={option}
          selected={option.value === value}
          reduced={reduced}
          onPress={() => {
            if (option.value === value) return;
            haptic('tick');
            onValueChange(option.value);
          }}
          onLayout={(layout) =>
            setLayouts((l) => {
              const prev = l[option.value];
              return prev && prev.y === layout.y && prev.height === layout.height
                ? l
                : { ...l, [option.value]: layout };
            })
          }
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: colors.azure, borderRadius: radius.lg + RING / 2 },
          ring,
        ]}
      />
    </View>
  );
}

type CardProps = {
  option: ChoiceCardOption;
  selected: boolean;
  reduced: boolean;
  onPress: () => void;
  onLayout: (layout: LayoutRectangle) => void;
};

function Card({ option, selected, reduced, onPress, onLayout }: CardProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const on = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    on.set(withSpring(selected ? 1 : 0, spring('bouncy', reduced)));
  }, [selected, reduced, on]);

  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.015 }] }));

  return (
    <Pressable
      onPress={onPress}
      disabled={option.disabled}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('smooth', reduced)))}
      onLayout={(e) => onLayout(e.nativeEvent.layout)}
      accessibilityRole="radio"
      accessibilityLabel={[option.title, option.badge, option.detail, option.description]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ checked: selected, disabled: option.disabled }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: selected ? colors.surfaceRaised : colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: space[4],
            gap: space[3],
            opacity: option.disabled ? 0.45 : 1,
          },
          shell,
        ]}
      >
        <Radio on={on} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {option.title}
            </Text>
            {option.badge ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.azureSoft, borderRadius: radius.pill },
                ]}
              >
                <Text
                  style={{
                    color: colors.azure,
                    fontSize: font.size.xs,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </View>
          {option.description ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {option.description}
            </Text>
          ) : null}
        </View>
        {option.detail ? (
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.md,
              fontWeight: font.weight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {option.detail}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function Radio({ on }: { on: SharedValue<number> }) {
  const { colors } = useKinetikTheme();
  const outer = useAnimatedStyle(() => ({
    borderColor: on.get() > 0.5 ? colors.azure : colors.borderStrong,
  }));
  const inner = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(0, on.get()) }],
  }));
  return (
    <Animated.View style={[styles.radio, outer]}>
      <Animated.View style={[styles.radioDot, { backgroundColor: colors.azure }, inner]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2 },
  ring: { position: 'absolute', left: -RING / 2, right: -RING / 2, borderWidth: RING },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
