import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { durations, easings } from '../../lib/kinetik/motion/motion';
import { gradient } from '../../lib/kinetik/tokens/gradient';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type FadeScrollProps = {
  children: ReactNode;
  /** Scroll sideways instead of down. */
  horizontal?: boolean;
  /** Length of each edge fade. Defaults to 32. */
  fadeSize?: number;
  /** The colour behind the scroll view, which the edges fade into. Defaults to the theme background. */
  fadeColor?: string;
  /** A slim indicator that shows while scrolling. Defaults to true. */
  indicator?: boolean;
  /** Read by screen readers, e.g. "Terms of service". */
  accessibilityLabel?: string;
  testID?: string;
  /** Give it a height (or a width when horizontal), or it grows with its content. */
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const BAR = 3;
const INSET = 3;

/**
 * A scroll view whose edges fade only where there is more to see. At the top
 * there is no top fade; scroll a little and it fades in, reach the end and the
 * bottom fade goes. A slim indicator appears while scrolling and slips away
 * when it stops.
 */
export function FadeScroll({
  children,
  horizontal = false,
  fadeSize = 32,
  fadeColor,
  indicator = true,
  accessibilityLabel,
  testID,
  style,
  contentContainerStyle,
}: FadeScrollProps) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const ground = fadeColor ?? colors.background;
  const offset = useSharedValue(0);
  const content = useSharedValue(0);
  const frame = useSharedValue(0);
  const shown = useSharedValue(0);

  const hide = () => {
    'worklet';
    shown.set(withDelay(700, withTiming(0, { duration: durations.slow, easing: easings.exit })));
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      offset.set(horizontal ? e.contentOffset.x : e.contentOffset.y);
      content.set(horizontal ? e.contentSize.width : e.contentSize.height);
      frame.set(horizontal ? e.layoutMeasurement.width : e.layoutMeasurement.height);
      if (indicator) shown.set(1);
    },
    onEndDrag: () => hide(),
    onMomentumEnd: () => hide(),
  });

  const start = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, offset.get() / fadeSize)),
  }));
  const end = useAnimatedStyle(() => {
    const left = content.get() - frame.get() - offset.get();
    return { opacity: content.get() > frame.get() ? Math.min(1, Math.max(0, left / fadeSize)) : 0 };
  });
  const bar = useAnimatedStyle(() => {
    const total = content.get();
    const view = frame.get();
    if (total <= view || view === 0) return { opacity: 0 };
    const len = Math.max(24, (view / total) * (view - INSET * 2));
    const travel = view - INSET * 2 - len;
    const at = INSET + Math.min(1, Math.max(0, offset.get() / (total - view))) * travel;
    return horizontal
      ? { opacity: shown.get(), width: len, transform: [{ translateX: at }] }
      : { opacity: shown.get(), height: len, transform: [{ translateY: at }] };
  });

  const solid = ground;
  const clear = withAlpha(ground, 0);
  const startFade = gradient(
    `linear-gradient(${horizontal ? 'to right' : 'to bottom'}, ${solid}, ${clear})`,
  );
  const endFade = gradient(
    `linear-gradient(${horizontal ? 'to left' : 'to top'}, ${solid}, ${clear})`,
  );
  const edge = horizontal ? { width: fadeSize } : { height: fadeSize };

  return (
    <View testID={testID} style={[styles.root, style]}>
      <Animated.ScrollView
        horizontal={horizontal}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(w, h) => content.set(horizontal ? w : h)}
        onLayout={(e) =>
          frame.set(horizontal ? e.nativeEvent.layout.width : e.nativeEvent.layout.height)
        }
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={contentContainerStyle}
        // With reduced motion the native indicator stands in for the animated one.
        showsVerticalScrollIndicator={reduced && !horizontal}
        showsHorizontalScrollIndicator={reduced && horizontal}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.edge, horizontal ? styles.left : styles.top, edge, startFade, start]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.edge, horizontal ? styles.right : styles.bottom, edge, endFade, end]}
      />
      {indicator && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bar,
            horizontal ? styles.barX : styles.barY,
            { backgroundColor: colors.textSubtle },
            bar,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  edge: { position: 'absolute' },
  top: { top: 0, left: 0, right: 0 },
  bottom: { bottom: 0, left: 0, right: 0 },
  left: { left: 0, top: 0, bottom: 0 },
  right: { right: 0, top: 0, bottom: 0 },
  bar: { position: 'absolute', borderRadius: BAR },
  barY: { right: 2, top: 0, width: BAR },
  barX: { bottom: 2, left: 0, height: BAR },
});
