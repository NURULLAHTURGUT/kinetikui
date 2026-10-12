import { BlurTargetView, BlurView } from 'expo-blur';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export type MorphSheetProps = {
  /** The screen behind the sheet. It is blurred and set back while the sheet is open. */
  children: ReactNode;
  /** Content of the sheet. */
  sheet: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heights the sheet rests at, as fractions of the screen, lowest first. Defaults to [0.45, 0.92]. */
  snapPoints?: readonly number[];
  /** Snap point to open at. Defaults to 0. */
  initialSnap?: number;
  /** Called when the sheet settles at a snap point. */
  onSnap?: (index: number) => void;
  /** Blur the screen behind. Defaults to true. */
  blur?: boolean;
  /** A tick when the sheet settles at a new snap point. Defaults to true. */
  haptics?: boolean;
  /** Accessible name of the sheet. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const INSET = 10;
const RADIUS = 28;

/**
 * A bottom sheet with snap points that morphs as it rises: at its lowest stop
 * it floats as an inset card, at the top it becomes a full-width sheet. The
 * screen behind blurs and steps back.
 */
export function MorphSheet({
  children,
  sheet,
  open,
  onOpenChange,
  snapPoints = [0.45, 0.92],
  initialSnap = 0,
  onSnap,
  blur = true,
  haptics = true,
  accessibilityLabel,
  style,
}: MorphSheetProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const target = useRef<View>(null);
  const [height, setHeight] = useState(0);
  const snaps = [...snapPoints].sort((a, b) => a - b);
  const tops = snaps.map((s) => height * (1 - s));
  const lowest = tops[0] ?? height;
  const highest = tops[tops.length - 1] ?? height;

  // Distance from the top of the screen to the top of the sheet.
  const y = useSharedValue(100_000);
  const current = useSharedValue(-1);

  const settle = (index: number) => {
    if (index < 0) {
      onOpenChange(false);
      return;
    }
    haptic('tick');
    onSnap?.(index);
  };

  const animateTo = (to: number, velocity = 0, then?: () => void) => {
    'worklet';
    const done = (finished?: boolean) => {
      'worklet';
      if (finished && then) then();
    };
    y.set(
      reduced
        ? withTiming(to, timing('base', true), done)
        : withSpring(
            to,
            { ...spring('smooth', false, velocity), overshootClamping: to >= height },
            done,
          ),
    );
  };

  useEffect(() => {
    if (height === 0) return;
    if (open) {
      const i = Math.max(0, Math.min(tops.length - 1, initialSnap));
      current.set(i);
      animateTo(tops[i] ?? lowest);
    } else {
      current.set(-1);
      animateTo(height);
    }
    // Re-run only when visibility or layout changes, not on every snap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, height]);

  const pan = Gesture.Pan()
    .withTestId('morph-sheet')
    .enabled(open)
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      const base = tops[Math.max(0, current.get())] ?? lowest;
      const next = base + e.translationY;
      // Rubber-band above the highest stop.
      y.set(next < highest ? highest - (highest - next) * 0.25 : next);
    })
    .onEnd((e) => {
      const projected = y.get() + e.velocityY * 0.12;
      const closeLine = lowest + (height - lowest) * 0.4;
      if (projected > closeLine || e.velocityY > 1400) {
        current.set(-1);
        animateTo(height, e.velocityY, () => scheduleOnRN(settle, -1));
        return;
      }
      let best = 0;
      for (let i = 1; i < tops.length; i++) {
        if (Math.abs((tops[i] ?? 0) - projected) < Math.abs((tops[best] ?? 0) - projected))
          best = i;
      }
      const changed = best !== current.get();
      current.set(best);
      animateTo(
        tops[best] ?? lowest,
        e.velocityY,
        changed ? () => scheduleOnRN(settle, best) : undefined,
      );
    });

  // 0 closed → 1 at the lowest stop.
  const visibility = (v: number) => {
    'worklet';
    return height === 0 ? 0 : Math.max(0, Math.min(1, (height - v) / Math.max(1, height - lowest)));
  };
  // 0 at the lowest stop → 1 at the highest: drives the card-to-sheet morph.
  const morph = (v: number) => {
    'worklet';
    return highest >= lowest ? 0 : Math.max(0, Math.min(1, (lowest - v) / (lowest - highest)));
  };

  const sheetStyle = useAnimatedStyle(() => {
    const m = morph(y.get());
    const inset = INSET * (1 - m);
    return {
      top: y.get(),
      left: inset,
      right: inset,
      bottom: inset,
      borderTopLeftRadius: RADIUS - 8 * m,
      borderTopRightRadius: RADIUS - 8 * m,
      borderBottomLeftRadius: RADIUS * (1 - m),
      borderBottomRightRadius: RADIUS * (1 - m),
    };
  });
  const behind = useAnimatedStyle(() => {
    const v = visibility(y.get());
    return reduced ? {} : { transform: [{ scale: 1 - 0.04 * v }], borderRadius: 24 * v };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: visibility(y.get()) }));
  const blurProps = useAnimatedProps(() => ({
    intensity: Math.max(1, interpolate(visibility(y.get()), [0, 1], [0, 40])),
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const i = current.get();
    switch (e.nativeEvent.actionName) {
      case 'escape':
      case 'close':
        onOpenChange(false);
        break;
      case 'expand':
        if (i < tops.length - 1) {
          current.set(i + 1);
          animateTo(tops[i + 1] ?? highest);
          settle(i + 1);
        }
        break;
      case 'collapse':
        if (i > 0) {
          current.set(i - 1);
          animateTo(tops[i - 1] ?? lowest);
          settle(i - 1);
        }
        break;
    }
  };

  return (
    <View style={[styles.host, style]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <Animated.View
        style={[styles.fill, { overflow: 'hidden' }, behind]}
        importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={open}
      >
        <BlurTargetView ref={target} style={styles.fill}>
          {children}
        </BlurTargetView>
      </Animated.View>

      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, scrim]}
      >
        {blur ? (
          <AnimatedBlurView
            style={StyleSheet.absoluteFill}
            blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus"
            tint={theme.scheme === 'dark' ? 'dark' : 'light'}
            animatedProps={blurProps}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={() => onOpenChange(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          collapsable={false}
          accessibilityViewIsModal={open}
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={[
            { name: 'escape' },
            { name: 'close', label: 'Close' },
            { name: 'expand', label: 'Expand' },
            { name: 'collapse', label: 'Collapse' },
          ]}
          onAccessibilityAction={onAccessibilityAction}
          importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              boxShadow: theme.shadow.lg,
            },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          {sheet}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  sheet: { position: 'absolute', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  grabber: { height: 28, alignItems: 'center', justifyContent: 'center' },
  grabberBar: { width: 40, height: 5, borderRadius: 3 },
});
