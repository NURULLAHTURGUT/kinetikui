import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { durations, easings, spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import type { Palette } from '../../shared/tokens/tokens';

export type SwipeActionTone = 'danger' | 'azure' | 'neutral' | 'success' | 'warning';

export type SwipeAction = {
  key: string;
  label: string;
  /** Drawn above the label; receives the colour to use. */
  icon?: (color: string) => ReactNode;
  /** Defaults to `neutral`. */
  tone?: SwipeActionTone;
  /** Slide the row away and fold it shut before `onPress` runs, e.g. for Delete or Archive. */
  dismiss?: boolean;
  onPress: () => void;
};

export type SwipeRowProps = {
  /** The row's content. */
  children: ReactNode;
  /** Names the row for screen readers; its actions are offered as custom actions. */
  accessibilityLabel: string;
  /** Revealed by swiping right. */
  leading?: SwipeAction;
  /** Revealed by swiping left, edge-most first. The first one runs on a full swipe. */
  trailing?: readonly SwipeAction[];
  /** Width of each action button. Defaults to 76. */
  actionWidth?: number;
  /** A long swipe runs the edge-most action. Defaults to true. */
  fullSwipe?: boolean;
  /** A tick when a full swipe arms. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Share of the row's width past which a swipe runs the edge action. */
const FULL = 0.62;

function toneColors(tone: SwipeActionTone, c: Palette) {
  switch (tone) {
    case 'danger':
      return { bg: c.danger, fg: c.background };
    case 'azure':
      return { bg: c.azure, fg: c.onAzure };
    case 'success':
      return { bg: c.success, fg: c.background };
    case 'warning':
      return { bg: c.warning, fg: c.background };
    default:
      return { bg: c.surfaceRaised, fg: c.text };
  }
}

/**
 * A list row with actions behind it. Swipe to reveal them; they share the
 * space you open up. Swipe far enough and the edge action takes over the
 * whole row with a tick, and letting go runs it, sliding the row away if
 * it removes it.
 */
export function SwipeRow({
  children,
  accessibilityLabel,
  leading,
  trailing = [],
  actionWidth = 76,
  fullSwipe = true,
  haptics = true,
  testID,
  style,
}: SwipeRowProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [open, setOpen] = useState<'leading' | 'trailing' | null>(null);

  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const armed = useSharedValue(0);
  const armedAnim = useSharedValue(0);
  const fold = useSharedValue(1);

  const trailingW = trailing.length * actionWidth;
  const leadingW = leading ? actionWidth : 0;

  const close = () => {
    x.set(withSpring(0, spring('smooth', reduced)));
    setOpen(null);
  };

  const run = (action: SwipeAction, side: 'leading' | 'trailing') => {
    setOpen(null);
    if (!action.dismiss) {
      x.set(withSpring(0, spring('smooth', reduced)));
      armedAnim.set(withSpring(0, spring('smooth', reduced)));
      action.onPress();
      return;
    }
    if (reduced) {
      action.onPress();
      return;
    }
    // Slide off, then fold the row shut, then hand over to the list.
    const away = side === 'trailing' ? -width : width;
    x.set(withTiming(away, { duration: durations.base, easing: easings.exit }));
    fold.set(
      withTiming(0, { duration: durations.base, easing: easings.standard }, (finished) => {
        if (finished) scheduleOnRN(action.onPress);
      }),
    );
  };

  const arm = (on: boolean) => {
    if (on) haptic('tick');
  };

  const settle = (vx: number) => {
    'worklet';
    const pos = x.get();
    const w = width;
    if (fullSwipe && w > 0 && armed.get() === 1) {
      // Marked as run, so the edge action keeps the whole row while it plays out.
      armed.set(2);
      const side = pos < 0 ? 'trailing' : 'leading';
      const action = side === 'trailing' ? trailing[0] : leading;
      if (action) {
        scheduleOnRN(run, action, side);
        return;
      }
    }
    // Open if dragged past half the actions or flung that way; otherwise close.
    if (pos < 0 && trailingW > 0 && (pos < -trailingW / 2 || vx < -600) && vx < 400) {
      x.set(withSpring(-trailingW, spring('smooth', reduced)));
      scheduleOnRN(setOpen, 'trailing');
    } else if (pos > 0 && leadingW > 0 && (pos > leadingW / 2 || vx > 600) && vx > -400) {
      x.set(withSpring(leadingW, spring('smooth', reduced)));
      scheduleOnRN(setOpen, 'leading');
    } else {
      x.set(withSpring(0, spring('smooth', reduced)));
      scheduleOnRN(setOpen, null);
    }
  };

  const pan = Gesture.Pan()
    .withTestId('swipe-row')
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => start.set(x.get()))
    .onUpdate((e) => {
      let next = start.get() + e.translationX;
      // No actions on a side: resist instead of opening.
      if (next > 0 && !leading) next = Math.min(24, next * 0.15);
      if (next < 0 && trailing.length === 0) next = Math.max(-24, next * 0.15);
      x.set(next);
      if (!fullSwipe || width === 0) return;
      const on = Math.abs(next) > width * FULL ? 1 : 0;
      if (on !== armed.get()) {
        armed.set(on);
        // The edge action grows over the others on a spring rather than jumping.
        armedAnim.set(withSpring(on, spring('snappy', reduced)));
        scheduleOnRN(arm, on === 1);
      }
    })
    .onEnd((e) => settle(e.velocityX))
    .onFinalize(() => {
      if (armed.get() !== 2) armedAnim.set(withSpring(0, spring('snappy', reduced)));
      armed.set(0);
    });

  const front = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const shell = useAnimatedStyle(() => ({
    height: height > 0 && fold.get() < 1 ? height * fold.get() : undefined,
    opacity: fold.get() < 1 ? fold.get() : 1,
  }));
  const trailingBox = useAnimatedStyle(() => ({ width: Math.max(0, -x.get()) }));
  const leadingBox = useAnimatedStyle(() => ({ width: Math.max(0, x.get()) }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (leading && name === leading.key) return run(leading, 'leading');
    const action = trailing.find((a) => a.key === name);
    if (action) run(action, 'trailing');
  };

  return (
    <Animated.View
      testID={testID}
      style={[styles.shell, shell, style]}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        if (fold.get() === 1) setHeight(e.nativeEvent.layout.height);
      }}
    >
      {trailing.length > 0 ? (
        <Animated.View style={[styles.actions, styles.right, trailingBox]}>
          {[...trailing].reverse().map((action, i, list) => (
            <ActionButton
              key={action.key}
              action={action}
              edge={i === list.length - 1}
              count={list.length}
              x={x}
              armed={armedAnim}
              colors={colors}
              visible={open === 'trailing'}
              onPress={() => run(action, 'trailing')}
            />
          ))}
        </Animated.View>
      ) : null}
      {leading ? (
        <Animated.View style={[styles.actions, styles.left, leadingBox]}>
          <ActionButton
            action={leading}
            edge
            count={1}
            x={x}
            armed={armedAnim}
            colors={colors}
            visible={open === 'leading'}
            onPress={() => run(leading, 'leading')}
          />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View
          collapsable={false}
          accessible
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={[
            ...(leading ? [{ name: leading.key, label: leading.label }] : []),
            ...trailing.map((a) => ({ name: a.key, label: a.label })),
          ]}
          onAccessibilityAction={onAccessibilityAction}
          style={[{ backgroundColor: colors.surface }, front]}
        >
          {children}
          {open ? (
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close actions"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

type ActionButtonProps = {
  action: SwipeAction;
  /** The edge-most action, which takes over on a full swipe. */
  edge: boolean;
  count: number;
  x: SharedValue<number>;
  armed: SharedValue<number>;
  colors: Palette;
  visible: boolean;
  onPress: () => void;
};

function ActionButton({
  action,
  edge,
  count,
  x,
  armed,
  colors,
  visible,
  onPress,
}: ActionButtonProps) {
  const { font } = useKinetikTheme();
  const { bg, fg } = toneColors(action.tone ?? 'neutral', colors);

  const style = useAnimatedStyle(() => {
    const revealed = Math.abs(x.get());
    const share = revealed / count;
    const a = armed.get();
    return { width: edge ? share + (revealed - share) * a : share * (1 - a) };
  });
  const content = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (Math.abs(x.get()) / count - 28) / 30)),
  }));

  return (
    <Animated.View style={[styles.action, { backgroundColor: bg }, style]}>
      <Pressable
        onPress={onPress}
        disabled={!visible}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.actionPress}
      >
        <Animated.View style={[styles.actionContent, content]}>
          {action.icon ? action.icon(fg) : null}
          <Text
            numberOfLines={1}
            style={{ color: fg, fontSize: font.size.xs, fontWeight: font.weight.semibold }}
          >
            {action.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden' },
  actions: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  right: { right: 0, justifyContent: 'flex-end' },
  left: { left: 0 },
  action: { overflow: 'hidden' },
  actionPress: { flex: 1, justifyContent: 'center' },
  actionContent: { alignItems: 'center', gap: 4, minWidth: 64, alignSelf: 'center' },
});
