import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
import { minTouchTarget } from '../../shared/tokens/tokens';

export type ExpandToolbarItem = {
  key: string;
  label: string;
  /** Receives the colour to draw in: azure when picked, muted otherwise. */
  icon: (color: string) => ReactNode;
};

export type ExpandToolbarProps = {
  items: readonly ExpandToolbarItem[];
  value: string;
  onValueChange: (key: string) => void;
  /** Names the toolbar, e.g. "Drawing tools". */
  accessibilityLabel: string;
  /** A tick on change. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE = minTouchTarget;
const PAD = 4;
/** Space between the icon and its label, and after the label. */
const LABEL_GAP = 6;
const LABEL_END = 14;

/**
 * A row of icon buttons where the picked one grows to show its name. Its
 * neighbours slide aside to make room, the tint follows it, and the label
 * fades in as the button stretches.
 */
export function ExpandToolbar({
  items,
  value,
  onValueChange,
  accessibilityLabel,
  haptics = true,
  testID,
  style,
}: ExpandToolbarProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const label = { fontSize: font.size.sm, fontWeight: font.weight.semibold } as const;

  return (
    <View
      testID={testID}
      accessibilityRole="toolbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.tray,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill },
        style,
      ]}
    >
      {/* Every label measured once, out of sight, so each button knows how far to grow. */}
      <View
        style={styles.measure}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {items.map((item) => (
          <Text
            key={item.key}
            style={label}
            onLayout={(e) => {
              const w = Math.ceil(e.nativeEvent.layout.width);
              setWidths((prev) => (prev[item.key] === w ? prev : { ...prev, [item.key]: w }));
            }}
          >
            {item.label}
          </Text>
        ))}
      </View>
      {items.map((item) => (
        <Tool
          key={item.key}
          item={item}
          selected={item.key === value}
          labelWidth={widths[item.key] ?? 0}
          reduced={reduced}
          onPress={() => {
            if (item.key === value) return;
            haptic('tick');
            onValueChange(item.key);
          }}
        />
      ))}
    </View>
  );
}

type ToolProps = {
  item: ExpandToolbarItem;
  selected: boolean;
  labelWidth: number;
  reduced: boolean;
  onPress: () => void;
};

function Tool({ item, selected, labelWidth, reduced, onPress }: ToolProps) {
  const { colors, font, radius } = useKinetikTheme();
  const t = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(selected ? 1 : 0, spring('smooth', reduced)));
  }, [selected, reduced, t]);

  const grow = labelWidth + LABEL_GAP + LABEL_END - 10;
  const shell = useAnimatedStyle(() => ({
    width: SIZE + grow * Math.max(0, t.get()),
    backgroundColor: interpolateColor(t.get(), [0, 1], [colors.surface, colors.azureSoft]),
    transform: [{ scale: 1 - press.get() * 0.06 }],
  }));
  const text = useAnimatedStyle(() => ({
    opacity: Math.max(0, t.get() * 1.6 - 0.6),
    transform: [{ translateX: (1 - t.get()) * -6 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press.set(withSpring(1, spring('snappy', reduced)))}
      onPressOut={() => press.set(withSpring(0, spring('bouncy', reduced)))}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.tool, { borderRadius: radius.pill }, shell]}>
        <View style={styles.icon}>{item.icon(selected ? colors.azure : colors.textMuted)}</View>
        <Animated.View style={[styles.label, text]}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.azure,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            {item.label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: PAD,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    width: 1000,
    alignItems: 'flex-start',
  },
  tool: { height: SIZE, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  icon: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  label: { marginLeft: LABEL_GAP - 10 },
});
