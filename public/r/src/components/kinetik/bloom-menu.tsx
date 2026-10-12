import { useEffect, useState, type ReactNode } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { glow } from '../../lib/kinetik/tokens/tokens';

export type BloomAction = {
  key: string;
  /** Shown beside the action in the column layout, and read by screen readers. */
  label: string;
  icon: ReactNode;
  onPress: () => void;
};

export type BloomMenuProps = {
  /** Two to five actions, nearest the button first. */
  actions: readonly BloomAction[];
  /** `column` stacks labelled actions above the button; `arc` fans icons around it. Defaults to `column`. */
  layout?: 'column' | 'arc';
  /** Controlled state. Leave unset to let the menu keep its own. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Name of the main button. Defaults to 'Create'. */
  accessibilityLabel?: string;
  /** A light tap as it opens and as an action is chosen. Defaults to true. */
  haptics?: boolean;
  /**
   * Position the menu with this, usually absolutely in a corner. The box is
   * large enough to hold the open menu but lets touches through where empty.
   */
  style?: StyleProp<ViewStyle>;
};

const FAB = 60;
const ACTION = 48;
const GAP = 12;
/** Width the column layout leaves for labels. */
const COLUMN_WIDTH = 240;
/** Delay between actions as they bloom out, in ms. */
const STAGGER = 34;

type Spot = { x: number; y: number };

function layoutFor(kind: 'column' | 'arc', n: number) {
  if (kind === 'column') {
    const height = FAB + GAP + n * (ACTION + GAP);
    const c = { x: COLUMN_WIDTH - FAB / 2, y: height - FAB / 2 };
    const spots: Spot[] = Array.from({ length: n }, (_, i) => ({
      x: c.x,
      y: c.y - FAB / 2 - GAP - ACTION / 2 - i * (ACTION + GAP),
    }));
    return { width: COLUMN_WIDTH, height, c, spots, reach: c.y - spots[n - 1]!.y + ACTION };
  }
  // A quarter circle from the left of the button round to above it.
  const r = 92 + n * 6;
  const size = r + FAB / 2 + ACTION / 2 + 8;
  const c = { x: size - FAB / 2, y: size - FAB / 2 };
  const spots: Spot[] = Array.from({ length: n }, (_, i) => {
    const a = Math.PI * (1 + (n === 1 ? 0.25 : (0.5 * i) / (n - 1)));
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
  return { width: size, height: size, c, spots, reach: r + ACTION };
}

/**
 * A floating action button that blooms. The plus turns into a cross, a soft
 * halo opens behind it, and the actions spring out one after another, in a
 * labelled column or a fan of icons.
 */
export function BloomMenu({
  actions,
  layout = 'column',
  open,
  defaultOpen = false,
  onOpenChange,
  accessibilityLabel = 'Create',
  haptics = true,
  style,
}: BloomMenuProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;

  const n = actions.length;
  const box = layoutFor(layout, n);

  const t = useSharedValue(isOpen ? 1 : 0);
  const pressed = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(isOpen ? 1 : 0, spring(isOpen ? 'bouncy' : 'snappy', reduced)));
  }, [isOpen, reduced, t]);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInner(next);
    if (next) haptic('tap');
    onOpenChange?.(next);
  };
  const choose = (action: BloomAction) => {
    haptic('tap');
    setOpen(false);
    action.onPress();
  };

  const cross = useAnimatedStyle(() => ({
    transform: [{ rotate: `${t.get() * 135}deg` }, { scale: 1 - pressed.get() * 0.1 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 1.5),
    transform: [{ scale: Math.max(0, t.get()) }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'escape' && isOpen) setOpen(false);
  };

  return (
    <View pointerEvents="box-none" style={[{ width: box.width, height: box.height }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: box.reach * 2,
            height: box.reach * 2,
            borderRadius: box.reach,
            left: box.c.x - box.reach,
            top: box.c.y - box.reach,
            backgroundColor: colors.azureSoft,
          },
          halo,
        ]}
      />

      {actions.map((action, i) => (
        <Petal
          key={action.key}
          action={action}
          spot={box.spots[i]!}
          from={box.c}
          width={box.width}
          labelled={layout === 'column'}
          open={isOpen}
          // Out from the nearest; back in from the farthest.
          delay={(isOpen ? i : n - 1 - i) * STAGGER}
          reduced={reduced}
          onPress={() => choose(action)}
        />
      ))}

      <Pressable
        onPress={() => setOpen(!isOpen)}
        onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
        onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isOpen }}
        accessibilityActions={isOpen ? [{ name: 'escape' }] : []}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.fab,
          {
            left: box.c.x - FAB / 2,
            top: box.c.y - FAB / 2,
            backgroundColor: colors.azure,
            boxShadow: glow(colors.azure),
          },
        ]}
      >
        <Animated.View style={[styles.plus, cross]}>
          <View style={[styles.bar, { backgroundColor: colors.onAzure }]} />
          <View style={[styles.bar, styles.upright, { backgroundColor: colors.onAzure }]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Petal({
  action,
  spot,
  from,
  width,
  labelled,
  open,
  delay,
  reduced,
  onPress,
}: {
  action: BloomAction;
  spot: Spot;
  from: Spot;
  /** Width of the menu's box, to anchor the petal by its right edge. */
  width: number;
  labelled: boolean;
  open: boolean;
  delay: number;
  reduced: boolean;
  onPress: () => void;
}) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const t: SharedValue<number> = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    const to = withSpring(open ? 1 : 0, spring(open ? 'bouncy' : 'snappy', reduced));
    t.set(reduced ? to : withDelay(delay, to));
  }, [open, delay, reduced, t]);

  const dx = from.x - spot.x;
  const dy = from.y - spot.y;
  const travel = useAnimatedStyle(() => {
    const k = t.get();
    return {
      opacity: Math.max(0, Math.min(1, k * 2)),
      transform: [
        { translateX: dx * (1 - k) },
        { translateY: dy * (1 - k) },
        { scale: 0.4 + 0.6 * k },
      ],
    };
  });
  const tag = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, t.get() * 2 - 0.8)),
    transform: [{ translateX: (1 - t.get()) * 14 }],
  }));

  return (
    <Animated.View
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.petal,
        { right: width - spot.x - ACTION / 2, top: spot.y - ACTION / 2 },
        travel,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={styles.petalRow}
      >
        {labelled ? (
          <Animated.View
            style={[
              styles.tag,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.sm,
                boxShadow: shadow.sm,
              },
              tag,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
              }}
            >
              {action.label}
            </Text>
          </Animated.View>
        ) : null}
        <View
          style={[
            styles.action,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              boxShadow: shadow.md,
            },
          ]}
        >
          {action.icon}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute' },
  fab: {
    position: 'absolute',
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: 22, height: 2.5, borderRadius: 2 },
  upright: { transform: [{ rotate: '90deg' }] },
  // Anchored by its right edge, so labels grow leftwards; it scales from that side too.
  petal: { position: 'absolute', transformOrigin: 'right' },
  petalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  action: {
    width: ACTION,
    height: ACTION,
    borderRadius: ACTION / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
