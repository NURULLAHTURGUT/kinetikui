import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

/** Side padding of the touch area. */
const PAD = 8;

export type PageDotsProps = {
  count: number;
  /** The current page. With `progress`, still pass it: screen readers and taps read it. */
  index?: number;
  /**
   * The scroll position in pages (1.5 is halfway from the second page to the
   * third), e.g. from `useAnimatedScrollHandler`. The dots then follow the
   * finger instead of jumping from page to page.
   */
  progress?: SharedValue<number>;
  /** Tapping a dot, or a screen reader swipe, asks for that page. */
  onPageChange?: (index: number) => void;
  /** `worm` stretches between dots; `expand` widens the current dot. Defaults to `worm`. */
  variant?: 'worm' | 'expand';
  /** Dot diameter. Defaults to 8. */
  size?: number;
  /** Colour of the current page. Defaults to the theme azure. */
  color?: string;
  /** Names the pager. Defaults to 'Page'. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Page dots that move with the scroll. As a worm, the current dot stretches
 * toward the next page and its tail catches up; expanded, the current dot
 * widens into a pill and hands the width over as you swipe.
 */
export function PageDots({
  count,
  index = 0,
  progress,
  onPageChange,
  variant = 'worm',
  size = 8,
  color,
  accessibilityLabel = 'Page',
  testID,
  style,
}: PageDotsProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const ink = color ?? colors.azure;
  const gap = size;
  const step = size + gap;
  const wide = size * 3;

  // Without a scroll position, follow `index` on a spring.
  const own = useSharedValue(index);
  useEffect(() => {
    own.set(withSpring(index, spring('smooth', reduced)));
  }, [index, reduced, own]);
  const at = progress ?? own;

  const current = Math.max(0, Math.min(count - 1, Math.round(index)));
  const pick = (e: GestureResponderEvent) => {
    if (!onPageChange) return;
    // Relative to the pressable (the dots ignore touches), less its side padding.
    const x = e.nativeEvent.locationX - PAD;
    const extra = variant === 'expand' ? wide - size : 0;
    const i = Math.round((x - size / 2 - (x > current * step ? extra : 0)) / step);
    onPageChange(Math.max(0, Math.min(count - 1, i)));
  };
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (!onPageChange) return;
    const next = current + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
    if (next >= 0 && next < count) onPageChange(next);
  };

  const worm = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(count - 1, at.get()));
    const i = Math.floor(p);
    const f = p - i;
    // The head leads over the first half of the move, the tail catches up over the second.
    const head = i + Math.min(1, f * 2);
    const tail = i + Math.max(0, f * 2 - 1);
    return { left: tail * step, width: (head - tail) * step + size };
  });

  const row = (
    <View pointerEvents="none" style={[styles.row, { gap, height: size }]}>
      {Array.from({ length: count }, (_, i) =>
        variant === 'expand' ? (
          <ExpandDot
            key={i}
            index={i}
            at={at}
            size={size}
            wide={wide}
            ink={ink}
            track={colors.track}
          />
        ) : (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.track,
            }}
          />
        ),
      )}
      {variant === 'worm' ? (
        <Animated.View
          style={[
            styles.worm,
            { height: size, borderRadius: size / 2, backgroundColor: ink },
            worm,
          ]}
        />
      ) : null}
    </View>
  );

  return (
    <Pressable
      testID={testID}
      onPress={pick}
      disabled={!onPageChange}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 1,
        max: count,
        now: current + 1,
        text: `${current + 1} of ${count}`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={[styles.hit, style]}
    >
      {row}
    </Pressable>
  );
}

type ExpandDotProps = {
  index: number;
  at: SharedValue<number>;
  size: number;
  wide: number;
  ink: string;
  track: string;
};

function ExpandDot({ index, at, size, wide, ink, track }: ExpandDotProps) {
  const fill = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(at.get() - index));
    return { width: size + (wide - size) * near, opacity: 0.25 + near * 0.75 };
  });
  return (
    <View style={{ height: size, borderRadius: size / 2, backgroundColor: track }}>
      <Animated.View
        style={[{ height: size, borderRadius: size / 2, backgroundColor: ink }, fill]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: PAD,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  worm: { position: 'absolute', top: 0 },
});
