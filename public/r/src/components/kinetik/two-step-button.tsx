import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type TwoStepButtonProps = {
  /** What the button does, e.g. "Delete project". */
  children: string;
  /** The confirming half. Defaults to 'Confirm'. */
  confirmLabel?: string;
  /** The way out. Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** Runs on the second, confirming press. */
  onConfirm: () => void;
  /** How long the question stays open, in ms, before it quietly closes. Defaults to 4000. */
  timeout?: number;
  /** `danger` for destructive actions; `azure` and `ember` for weighty but safe ones. Defaults to `danger`. */
  tone?: 'danger' | 'azure' | 'ember';
  /** Haptics as it opens and confirms. Defaults to true. */
  haptics?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 52;
const INSET = 4;
/** Share of the width the confirming half takes. */
const SPLIT = 0.56;

/**
 * A button that asks before it acts. The first press splits it in two: a
 * solid confirming half grows in from the edge while the label turns into
 * Cancel, and a lighter band drains across the confirm side until the question
 * closes by itself.
 */
export function TwoStepButton({
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  timeout = 4000,
  tone = 'danger',
  haptics = true,
  disabled = false,
  testID,
  style,
}: TwoStepButtonProps) {
  const { colors, font, radius } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [armed, setArmed] = useState(false);
  const [width, setWidth] = useState(0);
  const open = armed && !disabled;

  const ink = tone === 'azure' ? colors.azure : tone === 'ember' ? colors.ember : colors.danger;
  const onInk = tone === 'azure' ? colors.onAzure : colors.onEmber;

  const arm = useSharedValue(0);
  const left = useSharedValue(1);
  const pressed = useSharedValue(0);

  useEffect(() => {
    arm.set(withSpring(open ? 1 : 0, spring('smooth', reduced)));
    if (!open) return;
    // The question closes by itself; the line shows how long is left.
    left.set(1);
    if (!reduced) left.set(withTiming(0, { duration: timeout, easing: Easing.linear }));
    const id = setTimeout(() => setArmed(false), timeout);
    return () => clearTimeout(id);
  }, [open, reduced, timeout, arm, left]);

  const ask = () => {
    setArmed(true);
    haptic('tap');
    AccessibilityInfo.announceForAccessibility(`${confirmLabel} ${children}?`);
  };
  const confirm = () => {
    setArmed(false);
    haptic('thud');
    onConfirm();
  };

  const full = Math.max(0, width - INSET * 2);
  const segment = useAnimatedStyle(() => {
    const a = arm.get();
    const dot = HEIGHT - INSET * 2;
    return {
      width: dot + (full * SPLIT - dot) * a,
      opacity: Math.min(1, a * 3),
    };
  });
  const idleLabel = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, arm.get() * 1.6),
    transform: [{ translateX: -arm.get() * 18 }, { scale: 1 - arm.get() * 0.06 }],
  }));
  const cancel = useAnimatedStyle(() => ({
    opacity: Math.max(0, arm.get() * 1.6 - 0.6),
    transform: [{ translateX: (1 - arm.get()) * 16 }],
  }));
  const confirmText = useAnimatedStyle(() => ({
    opacity: Math.max(0, arm.get() * 2 - 1),
    transform: [{ scale: 0.92 + arm.get() * 0.08 }],
  }));
  const drain = useAnimatedStyle(() => ({ width: `${left.get() * 100}%` }));
  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.02 }] }));

  const label = (text: string, color: string) => (
    <Text
      numberOfLines={1}
      style={{ color, fontSize: font.size.md, fontWeight: font.weight.semibold }}
    >
      {text}
    </Text>
  );

  return (
    <Animated.View
      testID={testID}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.shell,
        {
          borderRadius: radius.pill,
          backgroundColor: withAlpha(ink, 0.12),
          opacity: disabled ? 0.45 : 1,
        },
        style,
        shell,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.segment, { borderRadius: radius.pill, backgroundColor: ink }, segment]}
      >
        <Animated.View style={[styles.drain, { backgroundColor: withAlpha(onInk, 0.16) }, drain]} />
        <Animated.View style={[styles.center, confirmText]}>
          {label(confirmLabel, onInk)}
        </Animated.View>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.center, styles.fill, idleLabel]}>
        {label(children, ink)}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.center, styles.cancel, { width: `${(1 - SPLIT) * 100}%` }, cancel]}
      >
        {label(cancelLabel, colors.text)}
      </Animated.View>

      {open ? (
        <View style={styles.halves}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={() => setArmed(false)}
            style={{ flex: 1 - SPLIT }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${confirmLabel}: ${children}`}
            onPress={confirm}
            style={{ flex: SPLIT }}
          />
        </View>
      ) : (
        <Pressable
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={children}
          accessibilityHint="Asks you to confirm"
          accessibilityState={{ disabled }}
          onPress={ask}
          onPressIn={() => pressed.set(withSpring(1, spring('snappy', reduced)))}
          onPressOut={() => pressed.set(withSpring(0, spring('bouncy', reduced)))}
          style={styles.fill}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { height: HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  fill: { ...StyleSheet.absoluteFill },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  segment: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    right: INSET,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  drain: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  cancel: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  halves: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
});
