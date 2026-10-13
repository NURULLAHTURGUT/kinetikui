import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type LiftMenuAction = {
  key: string;
  label: string;
  /** Drawn after the label; receives the colour to use. */
  icon?: (color: string) => ReactNode;
  destructive?: boolean;
  onPress: () => void;
};

export type LiftMenuProps = {
  /** The content that lifts: a card, a photo, a row. */
  children: ReactNode;
  actions: readonly LiftMenuAction[];
  /** Names the content for screen readers. Its actions are offered as custom actions. */
  accessibilityLabel: string;
  /** A plain tap, e.g. to open the item. */
  onPress?: () => void;
  /** How long to hold before it lifts, in ms. Defaults to 380. */
  delay?: number;
  /** Menu width. Defaults to 240. */
  menuWidth?: number;
  /** A thud as it lifts. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Rect = { x: number; y: number; width: number; height: number };

const ROW = 46;
const MARGIN = 16;
const GAP = 10;
const LIFT = 1.03;

/**
 * A context menu that lifts its content. Press and hold: the content sinks a
 * little, then rises out of the page above a dimmed screen, moving up if it
 * must to make room, and its actions unfold beneath it.
 */
export function LiftMenu({
  children,
  actions,
  accessibilityLabel,
  onPress,
  delay = 380,
  menuWidth = 240,
  haptics = true,
  testID,
  style,
}: LiftMenuProps) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const window = useWindowDimensions();
  const ref = useRef<View>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const press = useSharedValue(0);
  const t = useSharedValue(0);

  const menuH = actions.length * ROW + 12;
  // How far the content moves up so the menu fits below it.
  const shift = rect
    ? Math.max(
        Math.min(0, window.height - MARGIN - (rect.y + rect.height + GAP + menuH)),
        MARGIN - rect.y,
      )
    : 0;
  const menuLeft = rect
    ? rect.x + rect.width / 2 > window.width / 2
      ? Math.max(MARGIN, rect.x + rect.width - menuWidth)
      : Math.min(window.width - menuWidth - MARGIN, rect.x)
    : 0;
  const fromRight = rect ? rect.x + rect.width / 2 > window.width / 2 : false;

  const lift = () => {
    setRect(null);
    setVisible(true);
    haptic('thud');
    ref.current?.measureInWindow((x, y, width, height) => setRect({ x, y, width, height }));
  };

  useEffect(() => {
    if (!visible || !rect) return;
    t.set(0);
    t.set(reduced ? 1 : withSpring(1, spring('smooth')));
  }, [visible, rect, reduced, t]);

  const close = (then?: () => void) => {
    const done = () => {
      setVisible(false);
      then?.();
    };
    if (reduced) {
      t.set(0);
      done();
      return;
    }
    t.set(
      withTiming(0, { duration: durations.base, easing: easings.exit }, (finished) => {
        if (finished) scheduleOnRN(done);
      }),
    );
  };

  const source = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.03 }],
  }));
  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, t.get()) }));
  const preview = useAnimatedStyle(() => ({
    transform: [{ translateY: shift * t.get() }, { scale: 0.97 + (LIFT - 0.97) * t.get() }],
  }));
  const menu = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (t.get() - 0.2) / 0.8));
    return {
      opacity: p,
      transform: [{ translateY: shift * t.get() + (1 - p) * -10 }, { scale: 0.85 + p * 0.15 }],
    };
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') return onPress?.();
    if (name === 'longpress') return lift();
    actions.find((a) => a.key === name)?.onPress();
  };

  return (
    <>
      <Pressable
        ref={ref}
        testID={testID}
        onPress={onPress}
        onLongPress={lift}
        delayLongPress={delay}
        // The content sinks while held, so the lift reads as a release.
        onPressIn={() => {
          if (!reduced) press.set(withTiming(1, { duration: delay, easing: easings.standard }));
        }}
        onPressOut={() => press.set(withSpring(0, spring('smooth', reduced)))}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Hold for actions"
        accessibilityActions={[
          ...(onPress ? [{ name: 'activate' }] : []),
          { name: 'longpress', label: 'Show actions' },
          ...actions.map((a) => ({ name: a.key, label: a.label })),
        ]}
        onAccessibilityAction={onAccessibilityAction}
        style={style}
      >
        <Animated.View style={[source, { opacity: visible ? 0 : 1 }]}>{children}</Animated.View>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => close()}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={StyleSheet.absoluteFill} onAccessibilityEscape={() => close()}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => close()}
              accessibilityRole="button"
              accessibilityLabel="Close actions"
            />
          </Animated.View>

          {rect ? (
            <Animated.View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[
                styles.preview,
                { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
                preview,
              ]}
            >
              {children}
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              styles.menu,
              {
                left: menuLeft,
                top: rect ? rect.y + rect.height + GAP : 0,
                width: menuWidth,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.lg,
                boxShadow: shadow.lg,
                opacity: rect ? undefined : 0,
                transformOrigin: fromRight ? 'right top' : 'left top',
              },
              menu,
            ]}
          >
            {actions.map((action, i) => {
              const ink = action.destructive ? colors.danger : colors.text;
              return (
                <Pressable
                  key={action.key}
                  onPress={() => close(action.onPress)}
                  accessibilityRole="menuitem"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: pressed ? withAlpha(ink, 0.08) : undefined,
                    },
                    i > 0 && {
                      borderTopColor: colors.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={{ color: ink, fontSize: font.size.md, fontWeight: font.weight.medium }}
                  >
                    {action.label}
                  </Text>
                  {action.icon ? <View style={styles.icon}>{action.icon(ink)}</View> : null}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { position: 'absolute' },
  menu: { position: 'absolute', padding: 6, borderWidth: StyleSheet.hairlineWidth },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  icon: { width: 20, alignItems: 'center' },
});
