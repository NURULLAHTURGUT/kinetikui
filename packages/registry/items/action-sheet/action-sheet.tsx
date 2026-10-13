import { useContext, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
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
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type SheetAction = {
  label: string;
  onPress: () => void;
  /** "danger" is drawn in red, for actions that destroy something. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

export type ActionSheetProps = {
  visible: boolean;
  /** Called whenever the sheet closes: Cancel, a tap outside, a swipe down, Back. */
  onClose: () => void;
  actions: readonly SheetAction[];
  /** A short line above the actions, e.g. what they apply to. */
  title?: string;
  message?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** A tick when an action is chosen. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 56;
const MARGIN = 10;
const TRAVEL = 480;

/**
 * A sheet of actions from the bottom edge, with Cancel in its own card. It
 * springs up over a dimmed screen, follows the finger when dragged down and
 * drops away past a threshold; a chosen action runs once the sheet is gone.
 */
export function ActionSheet({
  visible,
  onClose,
  actions,
  title,
  message,
  cancelLabel = 'Cancel',
  haptics = true,
  testID,
  style,
}: ActionSheetProps) {
  const { colors, font, radius, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const insets = useContext(SafeAreaInsetsContext);
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const t = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(TRAVEL);

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

  // A chosen action runs after the sheet has gone, so it never fights the exit.
  const choose = (action: SheetAction) => {
    haptic('tick');
    onClose();
    setTimeout(action.onPress, reduced ? 0 : durations.base);
  };

  const pan = Gesture.Pan()
    .withTestId('action-sheet')
    .activeOffsetY(6)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      // Upwards it gives a little and resists; downwards it follows the finger.
      drag.set(e.translationY > 0 ? e.translationY : -Math.sqrt(-e.translationY) * 2);
    })
    .onEnd((e) => {
      if (e.translationY > height.get() * 0.28 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        drag.set(withSpring(0, spring('bouncy', reduced)));
      }
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: t.get() * (1 - Math.min(1, Math.max(0, drag.get()) / Math.max(1, height.get()))),
  }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.get(), [0, 1], [height.get() + 40, 0]) + drag.get() }],
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
        <View style={styles.root} onAccessibilityEscape={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              collapsable={false}
              testID={testID}
              onLayout={(e) => height.set(e.nativeEvent.layout.height)}
              style={[
                styles.sheet,
                { paddingBottom: MARGIN + (insets?.bottom ?? 0), gap: 8 },
                style,
                sheet,
              ]}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderRadius: radius.xl,
                    boxShadow: shadow.lg,
                  },
                ]}
              >
                <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
                {title || message ? (
                  <View style={[styles.head, { borderBottomColor: colors.border }]}>
                    {title ? (
                      <Text
                        accessibilityRole="header"
                        style={[
                          styles.center,
                          {
                            color: colors.textMuted,
                            fontSize: font.size.sm,
                            fontWeight: font.weight.semibold,
                          },
                        ]}
                      >
                        {title}
                      </Text>
                    ) : null}
                    {message ? (
                      <Text
                        style={[
                          styles.center,
                          { color: colors.textSubtle, fontSize: font.size.xs },
                        ]}
                      >
                        {message}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {actions.map((a, i) => (
                  <Pressable
                    key={a.label}
                    onPress={() => choose(a)}
                    disabled={a.disabled}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    accessibilityState={{ disabled: a.disabled }}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && {
                        borderTopColor: colors.border,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      },
                      {
                        backgroundColor: pressed ? colors.surfaceSunken : undefined,
                        opacity: a.disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: a.tone === 'danger' ? colors.danger : colors.text,
                        fontSize: font.size.lg,
                      }}
                    >
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                style={({ pressed }) => [
                  styles.row,
                  styles.card,
                  {
                    backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised,
                    borderRadius: radius.xl,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: font.size.lg,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  {cancelLabel}
                </Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: MARGIN },
  card: { overflow: 'hidden' },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 2,
  },
  head: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { textAlign: 'center' },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});
