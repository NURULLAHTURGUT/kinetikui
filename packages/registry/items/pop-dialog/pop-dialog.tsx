import { useEffect, useState, type ReactNode } from 'react';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type PopDialogAction = {
  label: string;
  onPress: () => void;
  /** "primary" is filled, "danger" is filled in red. Defaults to "default". */
  tone?: 'default' | 'primary' | 'danger';
};

export type PopDialogProps = {
  visible: boolean;
  /** Called for a tap outside, Back on Android and the screen reader escape gesture. */
  onClose: () => void;
  title: string;
  message?: string;
  /** Extra content between the message and the actions. */
  children?: ReactNode;
  /** One to three actions; two sit side by side, more are stacked. */
  actions: readonly PopDialogAction[];
  /** A tap outside closes it. Defaults to true. */
  dismissable?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const MAX_W = 360;

/**
 * A dialog that pops up from just below the middle of the screen: the screen
 * dims, the card rises and settles on a soft spring, and it sinks back as it
 * closes. It stays mounted until its exit has finished.
 */
export function PopDialog({
  visible,
  onClose,
  title,
  message,
  children,
  actions,
  dismissable = true,
  testID,
  style,
}: PopDialogProps) {
  const { colors, font, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const t = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      t.set(reduced ? 1 : withSpring(1, spring('smooth')));
      return;
    }
    if (reduced) {
      t.set(0);
      setTimeout(() => setMounted(false), 0);
      return;
    }
    t.set(
      withTiming(0, { duration: durations.quick, easing: easings.exit }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }),
    );
  }, [visible, reduced, t]);

  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, t.get()) }));
  const card = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: Math.min(1, p * 1.6),
      transform: [{ translateY: (1 - p) * 24 }, { scale: 0.94 + p * 0.06 }],
    };
  });

  const stacked = actions.length > 2;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* The modal is its own window, so focus stays inside; escape closes it. */}
      <View style={styles.root} onAccessibilityEscape={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissable ? onClose : undefined}
            accessible={dismissable}
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
            importantForAccessibility={dismissable ? 'auto' : 'no-hide-descendants'}
          />
        </Animated.View>
        <Animated.View
          testID={testID}
          style={[
            styles.card,
            {
              width: Math.min(MAX_W, window.width - space[6] * 2),
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderRadius: radius.xl,
              boxShadow: shadow.lg,
              padding: space[6],
              gap: space[2],
            },
            style,
            card,
          ]}
        >
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
          >
            {title}
          </Text>
          {message ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
              {message}
            </Text>
          ) : null}
          {children}
          <View style={[stacked ? styles.stack : styles.pair, { marginTop: space[4] }]}>
            {actions.map((a) => (
              <ActionButton key={a.label} action={a} fill={!stacked} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ActionButton({ action, fill }: { action: PopDialogAction; fill: boolean }) {
  const { colors, font, radius } = useKinetikTheme();
  const tone = action.tone ?? 'default';
  const bg = tone === 'primary' ? colors.ember : tone === 'danger' ? colors.danger : colors.surface;
  // Ink that reads on red: dark on the light red of the dark theme, white on the deep red of the light one.
  const fg = tone === 'default' ? colors.text : colors.onEmber;
  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => [
        styles.action,
        fill && styles.fill,
        {
          backgroundColor: bg,
          borderColor: tone === 'default' ? colors.borderStrong : bg,
          borderRadius: radius.md,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={{ color: fg, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1 },
  pair: { flexDirection: 'row', gap: 10 },
  stack: { gap: 8 },
  action: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { flex: 1 },
});
