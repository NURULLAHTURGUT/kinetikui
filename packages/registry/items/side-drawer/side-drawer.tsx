import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type DrawerItem = {
  key: string;
  label: string;
  /** A small count or tag on the right, e.g. "12". */
  badge?: string;
};

export type SideDrawerProps = {
  visible: boolean;
  /** Called for a tap outside, a drag back to the edge, Back and the escape gesture. */
  onClose: () => void;
  /** Navigation rows. They slide in one after another as the drawer opens. */
  items?: readonly DrawerItem[];
  /** The key of the current row, which gets a highlight. */
  active?: string;
  onSelect?: (key: string) => void;
  /** Content above the rows, e.g. the account. */
  header?: ReactNode;
  /** Content pinned to the bottom, e.g. settings and sign out. */
  footer?: ReactNode;
  /** Which edge it comes from. Defaults to "left". */
  side?: 'left' | 'right';
  /** Defaults to 85% of the screen, at most 320. */
  width?: number;
  /** A tick when a row is chosen. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 48;

/**
 * A navigation drawer from the side of the screen. The panel springs in over
 * a dimmed screen, its rows follow one after another, and a highlight sits
 * behind the current row. Drag it back towards its edge to close it.
 */
export function SideDrawer({
  visible,
  onClose,
  items = [],
  active,
  onSelect,
  header,
  footer,
  side = 'left',
  width,
  haptics = true,
  testID,
  style,
}: SideDrawerProps) {
  const { colors, radius, shadow, space } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const window = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const w = width ?? Math.min(320, window.width * 0.85);
  const dir = side === 'left' ? -1 : 1;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const t = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      t.set(reduced ? 1 : withSpring(1, spring('smooth')));
      return;
    }
    if (reduced) {
      t.set(0);
      setTimeout(() => setMounted(false), 0);
      return;
    }
    t.set(
      withTiming(0, { duration: durations.base, easing: easings.exit }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }),
    );
  }, [visible, reduced, t, drag]);

  const pan = Gesture.Pan()
    .withTestId('side-drawer')
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      // Towards the edge it follows the finger; the other way it resists.
      const toward = e.translationX * dir;
      drag.set(toward > 0 ? toward : -Math.sqrt(-toward) * 2);
    })
    .onEnd((e) => {
      if (drag.get() > w * 0.3 || e.velocityX * dir > 800) scheduleOnRN(onClose);
      else drag.set(withSpring(0, spring('bouncy', reduced)));
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: t.get() * (1 - Math.min(1, Math.max(0, drag.get()) / w)),
  }));
  const panel = useAnimatedStyle(() => ({
    transform: [
      { translateX: dir * (interpolate(t.get(), [0, 1], [w + 24, 0]) + Math.max(-12, drag.get())) },
    ],
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* A modal is its own window on Android, so gestures need their own root. */}
      <GestureHandlerRootView style={styles.fill}>
        <View style={StyleSheet.absoluteFill} onAccessibilityEscape={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              collapsable={false}
              testID={testID}
              style={[
                styles.panel,
                side === 'left' ? styles.left : styles.right,
                {
                  width: w,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  boxShadow: shadow.lg,
                  paddingTop: (insets?.top ?? 0) + space[4],
                  paddingBottom: (insets?.bottom ?? 0) + space[4],
                  borderTopRightRadius: side === 'left' ? radius.xl : 0,
                  borderBottomRightRadius: side === 'left' ? radius.xl : 0,
                  borderTopLeftRadius: side === 'right' ? radius.xl : 0,
                  borderBottomLeftRadius: side === 'right' ? radius.xl : 0,
                },
                style,
                panel,
              ]}
            >
              {header ? (
                <View style={{ paddingHorizontal: space[4], marginBottom: space[4] }}>
                  {header}
                </View>
              ) : null}
              <View style={[styles.rows, { paddingHorizontal: space[2] }]} accessibilityRole="menu">
                {items.map((item, i) => (
                  <Row
                    key={item.key}
                    item={item}
                    index={i}
                    t={t}
                    current={item.key === active}
                    onPress={() => {
                      haptic('tick');
                      onSelect?.(item.key);
                    }}
                  />
                ))}
              </View>
              {footer ? <View style={{ paddingHorizontal: space[4] }}>{footer}</View> : null}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

type RowProps = {
  item: DrawerItem;
  index: number;
  t: SharedValue<number>;
  current: boolean;
  onPress: () => void;
};

function Row({ item, index, t, current, onPress }: RowProps) {
  const { colors, font, radius } = useKinetikTheme();
  const motion = useAnimatedStyle(() => {
    const start = Math.min(0.45, 0.2 + index * 0.05);
    const p = interpolate(t.get(), [start, start + 0.5], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateX: (1 - p) * -16 }] };
  });
  return (
    <Animated.View style={motion}>
      <Pressable
        onPress={onPress}
        accessibilityRole="menuitem"
        accessibilityLabel={item.badge ? `${item.label}, ${item.badge}` : item.label}
        accessibilityState={{ selected: current }}
        style={({ pressed }) => [
          styles.row,
          {
            borderRadius: radius.md,
            backgroundColor: current
              ? colors.azureSoft
              : pressed
                ? colors.surfaceSunken
                : undefined,
          },
        ]}
      >
        <View style={[styles.mark, { backgroundColor: current ? colors.azure : 'transparent' }]} />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: current ? colors.azure : colors.text,
              fontSize: font.size.md,
              fontWeight: current ? font.weight.semibold : font.weight.regular,
            },
          ]}
        >
          {item.label}
        </Text>
        {item.badge ? (
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: font.size.sm,
              fontVariant: ['tabular-nums'],
            }}
          >
            {item.badge}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { position: 'absolute', top: 0, bottom: 0, borderWidth: StyleSheet.hairlineWidth },
  left: { left: 0 },
  right: { right: 0 },
  rows: { flex: 1, gap: 2 },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 14 },
  mark: { width: 3, height: 18, borderRadius: 2 },
  label: { flex: 1 },
});
