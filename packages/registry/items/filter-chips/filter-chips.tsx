import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import type { Palette } from '../../shared/tokens/tokens';

export type FilterChipOption = {
  value: string;
  label: string;
  /** A count after the label, e.g. the number of results. */
  count?: number;
};

export type FilterChipsProps = {
  options: readonly FilterChipOption[];
  /** Selected values. */
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  /** Pick any number of chips, or exactly one. Defaults to true. */
  multiple?: boolean;
  /** Names the group for screen readers, e.g. "Filter by type". */
  accessibilityLabel: string;
  /** A tick on each change. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 40;
const TARGET = 48;
/** Room the check mark takes when it slides in. */
const CHECK_W = 18;

/**
 * Filter chips that change shape when picked: a check mark slides in at the
 * front and pushes the label over, the chip grows to fit, and its outline
 * turns into a tinted fill. Neighbours make room as it grows.
 */
export function FilterChips({
  options,
  value,
  onValueChange,
  multiple = true,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: FilterChipsProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);

  const toggle = (v: string) => {
    haptic('tick');
    if (!multiple) {
      onValueChange([v]);
      return;
    }
    onValueChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <View
      testID={testID}
      accessibilityRole={multiple ? undefined : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, style]}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          option={option}
          selected={value.includes(option.value)}
          multiple={multiple}
          onPress={() => toggle(option.value)}
          reduced={reduced}
          colors={colors}
        />
      ))}
    </View>
  );
}

type ChipProps = {
  option: FilterChipOption;
  selected: boolean;
  multiple: boolean;
  onPress: () => void;
  reduced: boolean;
  colors: Palette;
};

function Chip({ option, selected, multiple, onPress, reduced, colors }: ChipProps) {
  const { font, radius } = useKinetikTheme();
  const on = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    on.set(withSpring(selected ? 1 : 0, spring('snappy', reduced)));
  }, [selected, reduced, on]);

  const shell = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], [colors.surface, colors.azureSoft]),
    borderColor: interpolateColor(on.get(), [0, 1], [colors.border, colors.azure]),
    transform: [{ scale: 1 - press.get() * 0.05 }],
  }));
  const slot = useAnimatedStyle(() => ({
    width: CHECK_W * Math.max(0, on.get()),
    opacity: Math.max(0, on.get() * 1.4 - 0.4),
  }));
  const check = useAnimatedStyle(() => ({
    transform: [{ rotate: '45deg' }, { scale: 0.4 + Math.max(0, on.get()) * 0.6 }],
  }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(on.get(), [0, 1], [colors.textMuted, colors.text]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={
        option.count === undefined ? option.label : `${option.label}, ${option.count}`
      }
      accessibilityState={multiple ? { checked: selected } : { selected }}
      style={styles.hit}
    >
      <Animated.View style={[styles.chip, { borderRadius: radius.pill }, shell]}>
        <Animated.View style={[styles.slot, slot]}>
          <Animated.View style={[styles.check, { borderColor: colors.azure }, check]} />
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[{ fontSize: font.size.sm, fontWeight: font.weight.medium }, label]}
        >
          {option.label}
        </Animated.Text>
        {option.count !== undefined ? (
          <Animated.Text
            style={{
              color: colors.textSubtle,
              fontSize: font.size.xs,
              fontWeight: font.weight.medium,
              fontVariant: ['tabular-nums'],
              marginLeft: 6,
            }}
          >
            {option.count}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Rows sit flush: the targets' own padding keeps the chips 8 pt apart.
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 0 },
  // The chip is drawn 40 pt tall inside a 48 pt target.
  hit: { height: TARGET, justifyContent: 'center' },
  chip: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  slot: { height: HEIGHT, justifyContent: 'center', overflow: 'hidden' },
  // A classic tick: the bottom and right edges of a narrow box, turned 45°.
  check: {
    width: 6,
    height: 11,
    marginLeft: 2,
    marginTop: -3,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
});
