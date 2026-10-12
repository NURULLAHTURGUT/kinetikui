import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { glow, minTouchTarget } from '../../shared/tokens/tokens';

export type MagnetButtonProps = {
  /** Button label. A string gets the variant's text style; any node is rendered as is. */
  children: ReactNode;
  onPress?: () => void;
  /** Defaults to `ember`. */
  variant?: 'ember' | 'surface';
  /** How strongly the button follows the finger, 0–1. Defaults to 0.5. */
  strength?: number;
  /** Width of the invisible field around the button that attracts the finger, in pt. Defaults to 40. */
  field?: number;
  /** Maximum distance the button travels toward the finger, in pt. Defaults to 14. */
  maxPull?: number;
  /** Plays a tick when the finger is captured and a tap on press. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  /** Required when `children` is not a string. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A button that leans toward the finger. Touching anywhere in the field around
 * it pulls the button closer; releasing over the button presses it. The field
 * never claims the gesture, so it is safe inside scroll views.
 */
export function MagnetButton({
  children,
  onPress,
  variant = 'ember',
  strength = 0.5,
  field = 40,
  maxPull = 14,
  haptics = true,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: MagnetButtonProps) {
  const { colors, radius, font, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const k = Math.max(0, Math.min(1, strength));
  const live = !disabled && !reduced;

  const box = useSharedValue({ x: 0, y: 0, width: 0, height: 0 });
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const captured = useSharedValue(false);

  const palette =
    variant === 'ember'
      ? { bg: colors.ember, fg: colors.onEmber, border: 'transparent', shadow: glow(colors.ember) }
      : {
          bg: colors.surfaceRaised,
          fg: colors.text,
          border: colors.borderStrong,
          shadow: shadow.sm,
        };

  const press = () => {
    haptic('tap');
    onPress?.();
  };
  const capture = () => haptic('tick');

  /** Moves the button toward (x, y). Returns true while the finger is over the button. */
  const follow = (x: number, y: number): boolean => {
    'worklet';
    const b = box.get();
    if (b.width === 0) return false;
    const dx = x - (b.x + b.width / 2);
    const dy = y - (b.y + b.height / 2);
    const inside =
      x >= b.x - 6 && x <= b.x + b.width + 6 && y >= b.y - 6 && y <= b.y + b.height + 6;
    if (live) {
      // Pull falls off with distance so the edge of the field is gentle.
      const reach = Math.max(b.width, b.height) / 2 + field;
      const d = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - d / (reach * 1.6));
      const px = Math.max(-maxPull, Math.min(maxPull, dx * 0.35 * k * (0.4 + falloff)));
      const py = Math.max(-maxPull, Math.min(maxPull, dy * 0.35 * k * (0.4 + falloff)));
      tx.set(withSpring(px, spring('snappy')));
      ty.set(withSpring(py, spring('snappy')));
    }
    if (inside !== captured.get()) {
      captured.set(inside);
      lift.set(withSpring(inside ? 1 : 0, spring('snappy', reduced)));
      if (inside) scheduleOnRN(capture);
    }
    return inside;
  };

  const release = (pressed: boolean) => {
    'worklet';
    tx.set(withSpring(0, spring('bouncy', reduced)));
    ty.set(withSpring(0, spring('bouncy', reduced)));
    lift.set(withSpring(0, spring('bouncy', reduced)));
    if (pressed) scheduleOnRN(press);
    captured.set(false);
  };

  const gesture = Gesture.Manual()
    .withTestId('magnet-button')
    .enabled(!disabled)
    // In the field the gesture stays passive, so a drag there still scrolls.
    // Once the finger is on the button the gesture claims the touch, so
    // wiggling a finger on the button does not scroll the page away.
    .onTouchesDown((e, manager) => {
      const t = e.allTouches[0];
      if (t && follow(t.x, t.y)) manager.activate();
    })
    .onTouchesMove((e, manager) => {
      const t = e.allTouches[0];
      if (t && follow(t.x, t.y)) manager.activate();
    })
    .onTouchesUp((_e, manager) => {
      release(captured.get());
      manager.end();
    })
    .onTouchesCancelled(() => {
      release(false);
    });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { scale: 1 + lift.get() * (reduced ? -0.02 : 0.04) },
    ],
  }));
  // The label travels further than the button, giving the face a little depth.
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() * 0.45 }, { translateY: ty.get() * 0.45 }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && !disabled) press();
  };

  return (
    <GestureDetector gesture={gesture}>
      {/* collapsable={false}: a layout-only View is flattened away on Fabric and
          the gesture would have no native view to attach to. */}
      <View collapsable={false} style={[{ padding: field, margin: -field }, styles.field, style]}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
          }
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={onAccessibilityAction}
          onLayout={(e) => box.set(e.nativeEvent.layout)}
          style={[
            styles.button,
            {
              minHeight: Math.max(minTouchTarget, 52),
              paddingHorizontal: space[8],
              borderRadius: radius.pill,
              backgroundColor: palette.bg,
              borderColor: palette.border,
              boxShadow: disabled ? undefined : palette.shadow,
              opacity: disabled ? 0.45 : 1,
            },
            buttonStyle,
          ]}
        >
          <Animated.View style={[styles.label, { gap: space[2] }, labelStyle]}>
            {typeof children === 'string' ? (
              <Text
                numberOfLines={1}
                style={{ color: palette.fg, fontSize: font.size.md, fontWeight: font.weight.bold }}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  field: { alignSelf: 'flex-start' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { flexDirection: 'row', alignItems: 'center' },
});
