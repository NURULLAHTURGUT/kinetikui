import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';

export type ParallaxHeaderProps = {
  /** Scrollable content below the header. */
  children: ReactNode;
  /** Header artwork (image, gradient, illustration). Fills the header area. */
  header: ReactNode;
  /** Large title shown over the artwork and in the compact bar once scrolled. */
  title: string;
  /** Small line under the large title. */
  subtitle?: string;
  /** Height of the expanded header, in pt. Defaults to 300. */
  headerHeight?: number;
  /** Height of the compact bar below the status bar, in pt. Defaults to 52. */
  barHeight?: number;
  /** Distance from the top of the screen to the bar. Defaults to the safe-area inset. */
  topInset?: number;
  /** Content shown at the right of the compact bar (e.g. a button). */
  barAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * A scroll view with a layered header: the artwork scrolls at half speed and
 * stretches when pulled down, the large title fades as it leaves, and a
 * compact bar with the title takes over at the top.
 */
export function ParallaxHeader({
  children,
  header,
  title,
  subtitle,
  headerHeight = 300,
  barHeight = 52,
  topInset,
  barAccessory,
  style,
  contentContainerStyle,
}: ParallaxHeaderProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const insets = useSafeAreaInsets();
  const top = topInset ?? insets.top;
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(ref);
  // The compact bar takes over once the large title has scrolled under it.
  const collapseAt = headerHeight - top - barHeight;

  const artwork = useAnimatedStyle(() => {
    const y = offset.get();
    if (y < 0) {
      // Pulled down (iOS bounce): stretch from the top edge.
      const scale = 1 + -y / headerHeight;
      return { transform: [{ translateY: y / 2 }, { scale }] };
    }
    return { transform: [{ translateY: reduced ? -y : -y * 0.5 }] };
  });

  const largeTitle = useAnimatedStyle(() => {
    const y = offset.get();
    return {
      opacity: interpolate(y, [0, collapseAt * 0.7], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: reduced
            ? 0
            : interpolate(y, [-100, 0, collapseAt], [24, 0, -24], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const bar = useAnimatedStyle(() => {
    const t = interpolate(offset.get(), [collapseAt - 24, collapseAt], [0, 1], Extrapolation.CLAMP);
    return { opacity: t };
  });
  const barTitle = useAnimatedStyle(() => {
    const t = interpolate(
      offset.get(),
      [collapseAt - 8, collapseAt + 16],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: t, transform: [{ translateY: reduced ? 0 : (1 - t) * 8 }] };
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.artwork, { height: headerHeight }, artwork]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {header}
      </Animated.View>

      <Animated.ScrollView
        ref={ref}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        // Lets it scroll when embedded in another scroll view on Android.
        nestedScrollEnabled
        contentContainerStyle={contentContainerStyle}
      >
        <View style={[styles.hero, { height: headerHeight, padding: theme.space[5] }]}>
          <Animated.View style={largeTitle}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size['3xl'],
                fontWeight: theme.font.weight.heavy,
                letterSpacing: -1,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.md,
                  marginTop: 4,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Animated.View>
        </View>
        <View style={{ backgroundColor: theme.colors.background }}>{children}</View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.bar,
          {
            paddingTop: top,
            height: top + barHeight,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          bar,
        ]}
      >
        <Animated.Text
          numberOfLines={1}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[
            styles.barTitle,
            {
              color: theme.colors.text,
              fontSize: theme.font.size.md,
              fontWeight: theme.font.weight.bold,
            },
            barTitle,
          ]}
        >
          {title}
        </Animated.Text>
      </Animated.View>
      {barAccessory ? (
        <View style={[styles.accessory, { top, height: barHeight, right: theme.space[3] }]}>
          {barAccessory}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  artwork: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  hero: { justifyContent: 'flex-end' },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: { textAlign: 'center', paddingHorizontal: 64 },
  accessory: { position: 'absolute', justifyContent: 'center' },
});
