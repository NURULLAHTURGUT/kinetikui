import { Children, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ScrollStackProps = {
  /** The cards. Each child becomes one card of `cardHeight`. */
  children: ReactNode;
  /** Scrolls away above the stack. */
  header?: ReactNode;
  /** Height of every card. Defaults to 300. */
  cardHeight?: number;
  /** Space between cards before they stack. Defaults to 24. */
  gap?: number;
  /** How much of each stacked card stays visible above the next. Defaults to 12. */
  peek?: number;
  /** Where the stack pins, from the top of the scroll view. Defaults to 16. */
  topInset?: number;
  /** How much a covered card shrinks per card on top of it, 0–0.15. Defaults to 0.06. */
  depth?: number;
  /** Corner radius of the cards. Defaults to the theme `xl` radius. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * A scroll view whose cards pin to the top and pile up: each one slides over
 * the last, and the cards underneath shrink and dim a little more with every
 * card that lands on them.
 */
export function ScrollStack({
  children,
  header,
  cardHeight = 300,
  gap = 24,
  peek = 12,
  topInset = 16,
  depth = 0.06,
  radius,
  style,
  contentContainerStyle,
}: ScrollStackProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const cards = Children.toArray(children);
  const n = cards.length;
  const r = radius ?? theme.radius.xl;
  const k = Math.max(0, Math.min(0.15, depth));

  const y = useSharedValue(0);
  const [headerH, setHeaderH] = useState(0);
  const [viewH, setViewH] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });

  // Room under the last card so it can scroll up to its pinned place.
  const tail = Math.max(0, viewH - cardHeight - topInset - (n - 1) * peek);
  const stackH = n * cardHeight + (n - 1) * gap + tail;

  return (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
      style={[styles.root, style]}
      contentContainerStyle={contentContainerStyle}
    >
      {header ? (
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>{header}</View>
      ) : null}
      <View style={{ height: stackH }}>
        {cards.map((card, i) => (
          <Card
            key={i}
            index={i}
            count={n}
            y={y}
            top={i * (cardHeight + gap)}
            // Scroll position at which this card reaches its pinned place.
            pin={headerH + i * (cardHeight + gap) - topInset - i * peek}
            travel={cardHeight + gap - peek}
            height={cardHeight}
            depth={reduced ? 0 : k}
            radius={r}
          >
            {card}
          </Card>
        ))}
      </View>
    </Animated.ScrollView>
  );
}

function Card({
  children,
  index,
  count,
  y,
  top,
  pin,
  travel,
  height,
  depth,
  radius,
}: {
  children: ReactNode;
  index: number;
  count: number;
  y: SharedValue<number>;
  top: number;
  pin: number;
  travel: number;
  height: number;
  depth: number;
  radius: number;
}) {
  const { colors, scheme, shadow } = useKinetikTheme();
  const ink = scheme === 'dark' ? colors.background : colors.text;

  const frame = useAnimatedStyle(() => {
    const past = y.get() - pin;
    // Cards that have landed on this one since it pinned.
    const covered = Math.max(0, Math.min(count - 1 - index, past / travel));
    return {
      transform: [{ translateY: Math.max(0, past) }, { scale: 1 - depth * covered }],
    };
  });
  const shade = useAnimatedStyle(() => {
    const covered = Math.max(0, Math.min(count - 1 - index, (y.get() - pin) / travel));
    return { opacity: Math.min(0.55, covered * (depth > 0 ? 0.22 : 0)) };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          top,
          height,
          borderRadius: radius,
          backgroundColor: colors.surface,
          boxShadow: shadow.lg,
        },
        frame,
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: ink }, shade]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    transformOrigin: 'top',
  },
});
