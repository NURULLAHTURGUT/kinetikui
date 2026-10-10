import { useImperativeHandle, useState, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type SwipeDirection = 'left' | 'right';

export type DeckfallHandle = {
  /** Swipes the top card away, e.g. from a button. */
  swipe: (direction: SwipeDirection) => void;
};

export type DeckfallProps<T> = {
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderCard: (item: T, index: number) => ReactNode;
  /** Called after a card leaves the deck. */
  onSwipe?: (item: T, direction: SwipeDirection, index: number) => void;
  /** Called once the last card has left. */
  onEmpty?: () => void;
  /** Rendered when no cards are left. */
  renderEmpty?: () => ReactNode;
  /** Cards visible in the stack, including the top one. Defaults to 3. */
  visible?: number;
  /** Fraction of the deck width a drag must cross to swipe. Defaults to 0.3. */
  threshold?: number;
  /** Stamps shown on the top card while dragging left / right, e.g. "Skip" / "Save". */
  leftLabel?: string;
  rightLabel?: string;
  /** Ticks when a drag crosses the swipe threshold. Defaults to true. */
  haptics?: boolean;
  /** Imperative handle with `swipe(direction)`. */
  ref?: Ref<DeckfallHandle>;
  style?: StyleProp<ViewStyle>;
  /** Style of each card frame (radius, background, padding). */
  cardStyle?: StyleProp<ViewStyle>;
};

/**
 * A stack of cards swiped away one at a time. The top card follows the
 * finger and tilts; the cards behind it rise into place as it leaves. A swipe
 * past the threshold or a quick flick sends the card off-screen.
 */
export function Deckfall<T>({
  data,
  keyExtractor,
  renderCard,
  onSwipe,
  onEmpty,
  renderEmpty,
  visible = 3,
  threshold = 0.3,
  leftLabel,
  rightLabel,
  haptics = true,
  ref,
  style,
  cardStyle,
}: DeckfallProps<T>) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const { width: screen } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const top = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const width = useSharedValue(0);
  const flying = useSharedValue(false);

  const advance = (direction: SwipeDirection, from: number) => {
    const item = data[from];
    setIndex(from + 1);
    if (item !== undefined) onSwipe?.(item, direction, from);
    if (from + 1 >= data.length) onEmpty?.();
  };

  const fling = (direction: SwipeDirection, velocity: number) => {
    'worklet';
    if (flying.get()) return;
    flying.set(true);
    const from = top.get();
    const to = (direction === 'right' ? 1 : -1) * (Math.max(width.get(), screen) * 1.4);
    const done = (finished?: boolean) => {
      'worklet';
      if (!finished) return;
      // Advance the deck and reset the drag in the same UI frame, so the card
      // behind is already in its resting pose when it becomes the top card.
      top.set(from + 1);
      dx.set(0);
      dy.set(0);
      flying.set(false);
      scheduleOnRN(advance, direction, from);
    };
    if (reduced) {
      dx.set(withTiming(to, timing('quick', true), done));
    } else {
      dx.set(
        withSpring(to, { ...spring('snappy', false, velocity), overshootClamping: true }, done),
      );
    }
  };

  useImperativeHandle(ref, () => ({
    swipe: (direction: SwipeDirection) => fling(direction, 0),
  }));

  // A tick when the drag crosses the threshold: releasing now will swipe.
  const tick = () => haptic('tick');
  useAnimatedReaction(
    () => width.get() > 0 && Math.abs(dx.get()) > width.get() * threshold && !flying.get(),
    (past, prev) => {
      if (prev !== null && past && !prev) scheduleOnRN(tick);
    },
  );

  // Drag handlers shared by every card; only the top card's gesture is enabled.
  const drag = (tx: number, ty: number) => {
    'worklet';
    if (flying.get()) return;
    dx.set(tx);
    dy.set(reduced ? 0 : ty * 0.25);
  };
  const release = (tx: number, vx: number) => {
    'worklet';
    if (flying.get()) return;
    const far = Math.abs(tx) > width.get() * threshold;
    const flick = Math.abs(vx) > 900 && Math.sign(vx) === Math.sign(tx);
    if (far || flick) {
      fling(tx > 0 ? 'right' : 'left', vx);
    } else {
      dx.set(withSpring(0, spring('bouncy', reduced)));
      dy.set(withSpring(0, spring('bouncy', reduced)));
    }
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'swipeLeft') fling('left', 0);
    if (e.nativeEvent.actionName === 'swipeRight') fling('right', 0);
  };

  const remaining = data.length - index;
  const shown = data.slice(index, index + visible + 1);

  return (
    <View
      style={[styles.deck, { paddingBottom: (visible - 1) * 12 }, style]}
      onLayout={(e) => width.set(e.nativeEvent.layout.width)}
    >
      {remaining <= 0 && renderEmpty ? <View style={styles.empty}>{renderEmpty()}</View> : null}
      {/* Render back to front so the top card paints last. */}
      {shown
        .map((item, i) => ({ item, n: index + i }))
        .reverse()
        .map(({ item, n }) => (
          <DeckCard
            key={keyExtractor(item, n)}
            n={n}
            isTop={n === index}
            top={top}
            dx={dx}
            dy={dy}
            width={width}
            threshold={threshold}
            visible={visible}
            reduced={reduced}
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            onDrag={drag}
            onRelease={release}
            onAccessibilityAction={onAccessibilityAction}
            style={[
              {
                borderRadius: theme.radius.xl,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                boxShadow: theme.shadow.md,
              },
              cardStyle,
            ]}
          >
            {renderCard(item, n)}
          </DeckCard>
        ))}
    </View>
  );
}

function DeckCard({
  n,
  top,
  dx,
  dy,
  width,
  threshold,
  visible,
  reduced,
  leftLabel,
  rightLabel,
  isTop,
  onDrag,
  onRelease,
  onAccessibilityAction,
  style,
  children,
}: {
  n: number;
  top: SharedValue<number>;
  dx: SharedValue<number>;
  dy: SharedValue<number>;
  width: SharedValue<number>;
  threshold: number;
  visible: number;
  reduced: boolean;
  leftLabel?: string;
  rightLabel?: string;
  isTop: boolean;
  onDrag: (tx: number, ty: number) => void;
  onRelease: (tx: number, vx: number) => void;
  onAccessibilityAction: (e: AccessibilityActionEvent) => void;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors, font, radius } = useKinetikTheme();

  const animated = useAnimatedStyle(() => {
    const w = Math.max(1, width.get());
    const progress = Math.min(1, Math.abs(dx.get()) / (w * threshold));
    const depth = n - top.get();
    if (depth < 0) return { opacity: 0 };
    if (depth === 0) {
      return {
        opacity: 1,
        transform: [
          { translateX: dx.get() },
          { translateY: dy.get() },
          { rotate: `${reduced ? 0 : (dx.get() / w) * 14}deg` },
        ],
      };
    }
    // Cards behind rise one step as the top card leaves.
    const pos = Math.max(0, depth - progress);
    return {
      opacity: depth >= visible ? interpolate(progress, [0, 1], [0, 1]) : 1,
      transform: [{ translateY: pos * 12 }, { scale: 1 - pos * 0.05 }],
    };
  });

  const leftStamp = useAnimatedStyle(() => {
    if (n !== top.get()) return { opacity: 0 };
    const w = Math.max(1, width.get());
    return { opacity: interpolate(-dx.get(), [w * 0.05, w * threshold], [0, 1], 'clamp') };
  });
  const rightStamp = useAnimatedStyle(() => {
    if (n !== top.get()) return { opacity: 0 };
    const w = Math.max(1, width.get());
    return { opacity: interpolate(dx.get(), [w * 0.05, w * threshold], [0, 1], 'clamp') };
  });

  const pan = Gesture.Pan()
    .withTestId(`deckfall-${n}`)
    .enabled(isTop)
    .activeOffsetX([-10, 10])
    .failOffsetY([-24, 24])
    .onUpdate((e) => onDrag(e.translationX, e.translationY))
    .onEnd((e) => onRelease(e.translationX, e.velocityX));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        collapsable={false}
        accessible={isTop}
        importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!isTop}
        accessibilityHint={isTop ? 'Swipe left or right, or use the actions menu' : undefined}
        accessibilityActions={
          isTop
            ? [
                { name: 'swipeLeft', label: leftLabel ?? 'Swipe left' },
                { name: 'swipeRight', label: rightLabel ?? 'Swipe right' },
              ]
            : undefined
        }
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.card, style, animated]}
      >
        {children}
        {rightLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              styles.stampLeft,
              { borderColor: colors.success, borderRadius: radius.sm },
              rightStamp,
            ]}
          >
            <Text style={[styles.stampText, { color: colors.success, fontSize: font.size.lg }]}>
              {rightLabel}
            </Text>
          </Animated.View>
        ) : null}
        {leftLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              styles.stampRight,
              { borderColor: colors.danger, borderRadius: radius.sm },
              leftStamp,
            ]}
          >
            <Text style={[styles.stampText, { color: colors.danger, fontSize: font.size.lg }]}>
              {leftLabel}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: { minHeight: 300 },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stamp: {
    position: 'absolute',
    top: 20,
    borderWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampLeft: { left: 20, transform: [{ rotate: '-12deg' }] },
  stampRight: { right: 20, transform: [{ rotate: '12deg' }] },
  stampText: { fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
});
