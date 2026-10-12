import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type FoldPanelProps = {
  title: string;
  /** A line under the title, visible while folded. */
  subtitle?: string;
  /** An icon before the title. It sits on a small tinted tile. */
  leading?: ReactNode;
  /** What unfolds. Any height; it is measured. */
  children: ReactNode;
  /** Controlled state. Leave unset to let the panel keep its own. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A panel that unfolds in place. The body grows to its measured height on a
 * spring and drifts into view a moment behind it, the chevron turns over,
 * and the panel itself lifts a shade.
 */
export function FoldPanel({
  title,
  subtitle,
  leading,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  style,
}: FoldPanelProps) {
  const { colors, font, radius, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const [bodyH, setBodyH] = useState(0);

  const t = useSharedValue(isOpen ? 1 : 0);
  const pressed = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(isOpen ? 1 : 0, spring('smooth', reduced)));
  }, [isOpen, reduced, t]);

  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };

  const shell = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.get(), [0, 1], [colors.surface, colors.surfaceRaised]),
    borderColor: interpolateColor(t.get(), [0, 1], [colors.border, colors.borderStrong]),
    transform: [{ scale: 1 - pressed.get() * 0.01 }],
  }));
  const well = useAnimatedStyle(() => ({ height: bodyH * Math.max(0, t.get()) }));
  // The body follows the fold: it fades in over the second half and settles downwards.
  const body = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, t.get() * 2 - 0.6)),
    transform: [{ translateY: (1 - t.get()) * -10 }],
  }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.get() * 180}deg` }] }));

  return (
    <Animated.View
      style={[styles.panel, { borderRadius: radius.lg, opacity: disabled ? 0.5 : 1 }, shell, style]}
    >
      <Pressable
        disabled={disabled}
        onPress={toggle}
        onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
        onPressOut={() => pressed.set(withSpring(0, spring('smooth', reduced)))}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        accessibilityState={{ expanded: isOpen, disabled }}
        style={[styles.header, { paddingHorizontal: space[4], gap: space[3] }]}
      >
        {leading ? (
          <View
            style={[styles.tile, { backgroundColor: colors.azureSoft, borderRadius: radius.sm }]}
          >
            {leading}
          </View>
        ) : null}
        <View style={styles.titles}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Animated.View style={[styles.chevronBox, chevron]}>
          <View style={[styles.chevron, { borderColor: colors.textMuted }]} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[styles.well, well]}
        accessibilityElementsHidden={!isOpen}
        importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        {/* Laid out at its natural height, unclipped, so it can be measured at any time. */}
        <Animated.View
          onLayout={(e) => setBodyH(Math.ceil(e.nativeEvent.layout.height))}
          style={[styles.body, { paddingHorizontal: space[4], paddingBottom: space[4] }, body]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 12 },
  tile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, gap: 2 },
  chevronBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  // A square's two edges, turned to point down.
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 1.75,
    borderBottomWidth: 1.75,
    transform: [{ translateY: -2 }, { rotate: '45deg' }],
  },
  well: { overflow: 'hidden' },
  body: { position: 'absolute', top: 0, left: 0, right: 0 },
});
