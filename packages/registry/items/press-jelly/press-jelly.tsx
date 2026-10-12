import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
import { glow, minTouchTarget, withAlpha } from '../../shared/tokens/tokens';

export type PressJellyVariant = 'ember' | 'ice' | 'surface';
export type PressJellySize = 'md' | 'lg';

export type PressJellyProps = {
  /** Button label. A string gets the variant's text style; any node is rendered as is. */
  children: ReactNode;
  onPress?: () => void;
  /** Defaults to `ember`. */
  variant?: PressJellyVariant;
  /** `md` is 48 pt tall, `lg` 56 pt. Defaults to `md`. */
  size?: PressJellySize;
  /** Optional element before the label, e.g. an icon. */
  leading?: ReactNode;
  disabled?: boolean;
  /** Shows a spinner and ignores presses. */
  loading?: boolean;
  /** How far the button squashes, 0–1. Defaults to 0.6. */
  squish?: number;
  /** Plays a light tap when the press lands. Defaults to true. */
  haptics?: boolean;
  /** Required when `children` is not a string. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Stretch to the parent's width. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT: Record<PressJellySize, number> = { md: 48, lg: 56 };

/**
 * A primary button that squashes like jelly under the finger and wobbles back
 * on release. The squash starts on the UI thread the instant the finger lands.
 */
export function PressJelly({
  children,
  onPress,
  variant = 'ember',
  size = 'md',
  leading,
  disabled = false,
  loading = false,
  squish = 0.6,
  haptics = true,
  accessibilityLabel,
  accessibilityHint,
  block = false,
  style,
}: PressJellyProps) {
  const theme = useKinetikTheme();
  const { colors, radius, font, space } = theme;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const inactive = disabled || loading;
  const k = Math.max(0, Math.min(1, squish));

  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  const palette = {
    ember: {
      bg: colors.ember,
      fg: colors.onEmber,
      border: 'transparent',
      shadow: glow(colors.ember),
    },
    ice: { bg: colors.ice, fg: colors.onIce, border: 'transparent', shadow: glow(colors.ice) },
    surface: {
      bg: colors.surfaceRaised,
      fg: colors.text,
      border: colors.borderStrong,
      shadow: theme.shadow.sm,
    },
  }[variant];

  const press = () => {
    haptic('tap');
    onPress?.();
  };

  const tap = Gesture.Tap()
    .withTestId('press-jelly')
    .enabled(!inactive)
    .maxDuration(60_000)
    .maxDistance(32)
    .onBegin(() => {
      if (reduced) {
        sx.set(withSpring(0.98, spring('snappy', true)));
        sy.set(withSpring(0.98, spring('snappy', true)));
        return;
      }
      sx.set(withSpring(1 + 0.08 * k, spring('snappy')));
      sy.set(withSpring(1 - 0.16 * k, spring('snappy')));
    })
    .onFinalize(() => {
      // Release with an opposing kick so the shape overshoots and wobbles.
      sx.set(withSpring(1, spring('bouncy', reduced, reduced ? 0 : -2.2 * k)));
      sy.set(withSpring(1, spring('bouncy', reduced, reduced ? 0 : 3.4 * k)));
    })
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(press);
    });

  const jelly = useAnimatedStyle(() => ({
    transform: [{ scaleX: sx.get() }, { scaleY: sy.get() }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && !inactive) press();
  };

  const label =
    typeof children === 'string' ? (
      <Text
        numberOfLines={1}
        style={{
          color: palette.fg,
          fontSize: size === 'lg' ? font.size.lg : font.size.md,
          fontWeight: font.weight.bold,
          letterSpacing: -0.2,
        }}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
        }
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, busy: loading }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.button,
          {
            height: HEIGHT[size],
            minWidth: Math.max(minTouchTarget, HEIGHT[size] * 2),
            paddingHorizontal: size === 'lg' ? space[8] : space[6],
            borderRadius: radius.pill,
            backgroundColor: palette.bg,
            borderColor: palette.border,
            boxShadow: inactive ? undefined : palette.shadow,
            opacity: disabled ? 0.45 : 1,
            alignSelf: block ? 'stretch' : 'flex-start',
          },
          style,
          jelly,
        ]}
      >
        {/* Top gloss gives the fill some volume. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius.pill },
            gradient(
              `linear-gradient(180deg, ${withAlpha(colors.highlight, variant === 'surface' ? 0.06 : 0.22)} 0%, ${withAlpha(colors.highlight, 0)} 55%)`,
            ),
          ]}
        />
        <View style={[styles.content, { gap: space[2], opacity: loading ? 0 : 1 }]}>
          {leading}
          {label}
        </View>
        {loading && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator color={palette.fg} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
