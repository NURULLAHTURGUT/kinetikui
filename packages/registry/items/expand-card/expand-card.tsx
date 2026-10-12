import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ExpandCardProps = {
  image: ImageSourcePropType;
  title: string;
  subtitle?: string;
  /** Shown under the title once the card is open. */
  children?: ReactNode;
  /** Controlled open state. */
  expanded?: boolean;
  /** Initial state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Image height divided by width when open. Defaults to 0.62. */
  imageAspect?: number;
  /** Size of the closed thumbnail. Defaults to 64. */
  thumbSize?: number;
  /** A light tap when it opens or closes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PAD = 12;
const GAP = 14;

/**
 * A row that opens into a card. The thumbnail grows into a wide picture,
 * the title slides under it and the body rises in; tap again and it all
 * folds back into the row.
 */
export function ExpandCard({
  image,
  title,
  subtitle,
  children,
  expanded: controlled,
  defaultExpanded = false,
  onExpandedChange,
  imageAspect = 0.62,
  thumbSize = 64,
  haptics = true,
  style,
}: ExpandCardProps) {
  const { colors, font, radius, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [internal, setInternal] = useState(defaultExpanded);
  const open = controlled ?? internal;

  const [width, setWidth] = useState(0);
  const [titleH, setTitleH] = useState(0);
  const [bodyH, setBodyH] = useState(0);
  const p = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    p.set(withSpring(open ? 1 : 0, spring('smooth', reduced)));
  }, [open, reduced, p]);

  const toggle = () => {
    const next = !open;
    haptic('tap');
    if (controlled === undefined) setInternal(next);
    onExpandedChange?.(next);
  };

  const tap = Gesture.Tap()
    .withTestId('expand-card')
    .maxDistance(16)
    .onEnd((_e, ok) => {
      if (ok) scheduleOnRN(toggle);
    });

  // Geometry in both states, from the measured width, title and body.
  const inner = Math.max(0, width - PAD * 2);
  const imageH = Math.round(inner * imageAspect);
  const closedH = PAD * 2 + thumbSize;
  const openH = PAD + imageH + GAP + titleH + (children ? space[3] + bodyH : 0) + PAD + 4;
  const titleClosed = { x: PAD + thumbSize + GAP, y: PAD + (thumbSize - titleH) / 2 };
  const titleOpen = { x: PAD + 4, y: PAD + imageH + GAP };

  const card = useAnimatedStyle(() => ({
    height: width === 0 ? closedH : interpolate(p.get(), [0, 1], [closedH, openH]),
  }));
  const picture = useAnimatedStyle(() => {
    const t = p.get();
    return {
      width: interpolate(t, [0, 1], [thumbSize, inner || thumbSize]),
      height: interpolate(t, [0, 1], [thumbSize, imageH || thumbSize]),
      borderRadius: interpolate(t, [0, 1], [radius.sm, radius.lg]),
    };
  });
  const heading = useAnimatedStyle(() => {
    const t = p.get();
    // The title dips out mid-journey so it never sits on the picture as it resizes.
    const mid = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    return {
      opacity: 1 - mid * 0.92,
      width: interpolate(t, [0, 1], [inner - thumbSize - GAP - 36, inner - 44]),
      transform: [
        { translateX: interpolate(t, [0, 1], [titleClosed.x, titleOpen.x]) },
        { translateY: interpolate(t, [0, 1], [titleClosed.y, titleOpen.y]) },
      ],
    };
  });
  const chevron = useAnimatedStyle(() => {
    const t = p.get();
    return {
      transform: [
        {
          translateY: interpolate(
            t,
            [0, 1],
            [PAD + thumbSize / 2 - 15, titleOpen.y + titleH / 2 - 15],
          ),
        },
        { rotate: `${interpolate(t, [0, 1], [0, 180])}deg` },
      ],
    };
  });
  const body = useAnimatedStyle(() => {
    const t = p.get();
    return {
      opacity: interpolate(t, [0.45, 1], [0, 1], 'clamp'),
      transform: [
        { translateY: titleOpen.y + titleH + space[3] + interpolate(t, [0, 1], [14, 0]) },
      ],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate') toggle();
  };

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        accessibilityState={{ expanded: open }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={[
          styles.card,
          {
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            boxShadow: shadow.md,
          },
          style,
          card,
        ]}
      >
        <Animated.View style={[styles.picture, picture]}>
          <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Animated.View>

        <Animated.View style={[styles.abs, heading]}>
          <View onLayout={(e) => setTitleH(Math.ceil(e.nativeEvent.layout.height))}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.chevron,
            { right: PAD + 2, backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            chevron,
          ]}
          pointerEvents="none"
        >
          <View style={[styles.chevronGlyph, { borderColor: colors.textMuted }]} />
        </Animated.View>

        {children ? (
          <Animated.View
            style={[styles.abs, { left: PAD + 4, right: PAD + 4 }, body]}
            importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!open}
          >
            <View onLayout={(e) => setBodyH(Math.ceil(e.nativeEvent.layout.height))}>
              {children}
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  picture: { position: 'absolute', left: PAD, top: PAD, overflow: 'hidden' },
  abs: { position: 'absolute', left: 0, top: 0 },
  chevron: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  chevronGlyph: {
    width: 8,
    height: 8,
    marginTop: -3,
    borderRightWidth: 1.75,
    borderBottomWidth: 1.75,
    transform: [{ rotate: '45deg' }],
  },
});
