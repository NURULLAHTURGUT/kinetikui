import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type AspectOption = {
  value: string;
  /** Width divided by height, e.g. 1, 3 / 2 or 9 / 16. */
  ratio: number;
  /** Read by screen readers, e.g. "Square" or "Portrait 2 by 3". */
  label: string;
};

export type AspectPickerAction = {
  icon: ReactNode;
  /** Accessible name, e.g. "More ratios". */
  label: string;
  onPress: () => void;
};

export type AspectPickerProps = {
  value: string;
  onChange: (value: string) => void;
  /** Defaults to square, landscape 3:2 and portrait 2:3. */
  options?: readonly AspectOption[];
  /** Names the group for screen readers. Defaults to "Aspect ratio". */
  label?: string;
  /** A button after the ratios, e.g. more ratios. */
  action?: AspectPickerAction;
  disabled?: boolean;
  /** A tick when the ratio changes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_OPTIONS: AspectOption[] = [
  { value: '1:1', ratio: 1, label: 'Square' },
  { value: '3:2', ratio: 3 / 2, label: 'Landscape 3 by 2' },
  { value: '2:3', ratio: 2 / 3, label: 'Portrait 2 by 3' },
];

/** The longest side of each ratio frame, in pt. */
const FRAME = 20;

/**
 * A row of aspect-ratio frames drawn to scale. A soft square slides to the
 * one you pick, and that frame brightens and grows a touch as it lands.
 */
export function AspectPicker({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Aspect ratio',
  action,
  disabled = false,
  haptics = true,
  style,
}: AspectPickerProps) {
  const { colors, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const slots = useRef<Record<string, number>>({});
  const [measured, setMeasured] = useState(0);
  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    const at = slots.current[value];
    if (at === undefined) return;
    shown.set(1);
    if (!placed.current || reduced) {
      x.set(at);
      placed.current = true;
      return;
    }
    x.set(withSpring(at, spring('smooth')));
  }, [value, measured, reduced, x, shown]);

  const onSlotLayout = (key: string) => (e: LayoutChangeEvent) => {
    slots.current[key] = e.nativeEvent.layout.x;
    setMeasured((m) => m + 1);
  };

  const highlight = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          paddingHorizontal: space[3],
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlight,
            { backgroundColor: withAlpha(colors.text, 0.12), borderRadius: radius.sm },
            highlight,
          ]}
        />
        {options.map((o, i) => (
          <Fragment key={o.value}>
            {i > 0 ? <View style={[styles.rule, { backgroundColor: colors.border }]} /> : null}
            <Choice
              option={o}
              on={o.value === value}
              disabled={disabled}
              onLayout={onSlotLayout(o.value)}
              onPress={() => {
                haptic('tick');
                onChange(o.value);
              }}
            />
          </Fragment>
        ))}
        {action ? (
          <>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              disabled={disabled}
              onPress={action.onPress}
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.6 : 1 }]}
            >
              {action.icon}
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function Choice({
  option,
  on,
  disabled,
  onLayout,
  onPress,
}: {
  option: AspectOption;
  on: boolean;
  disabled: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  onPress: () => void;
}) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const lift = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    lift.set(reduced ? (on ? 1 : 0) : withSpring(on ? 1 : 0, spring('bouncy')));
  }, [on, reduced, lift]);

  const frame = useAnimatedStyle(() => ({ transform: [{ scale: 1 + lift.get() * 0.12 }] }));
  const wide = option.ratio >= 1;
  const w = wide ? FRAME : FRAME * option.ratio;
  const h = wide ? FRAME / option.ratio : FRAME;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onLayout={onLayout}
      onPress={on ? undefined : onPress}
      style={styles.slot}
    >
      <Animated.View
        style={[
          styles.frame,
          { width: w, height: h, borderColor: on ? colors.text : colors.textMuted },
          frame,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { minHeight: 56, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  highlight: { position: 'absolute', left: 0, width: minTouchTarget, height: minTouchTarget },
  slot: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { borderWidth: 1.75, borderRadius: 3 },
  rule: { width: StyleSheet.hairlineWidth, height: 16 },
});
