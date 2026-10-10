import {
  Canvas,
  Group,
  LinearGradient,
  RadialGradient,
  RoundedRect,
  rrect,
  rect,
  vec,
  type SkSize,
} from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { TiltSensor, useTilt } from '../../lib/kinetik/hooks/use-tilt';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type GlintSource = 'touch' | 'tilt' | 'both';

export type GlintCardProps = Omit<ViewProps, 'style' | 'children'> & {
  children?: ReactNode;
  /** What moves the light. Defaults to `both`: finger while touching, device tilt otherwise. */
  source?: GlintSource;
  /** Strength of the glint, 0–1. Defaults to 0.7. */
  intensity?: number;
  /** Colour of the reflected light. Defaults to the theme highlight. */
  glintColor?: string;
  /** Maximum card rotation in degrees as the light moves. 0 keeps the card flat. Defaults to 4. */
  tiltDegrees?: number;
  /** Corner radius. Defaults to the theme `xl` radius. */
  radius?: number;
  /**
   * Static reflection with no sensor or gesture work. Use on low-power devices
   * or in long lists. Reduced-motion users always get this.
   */
  reduceEffects?: boolean;
  /** Pause sensor and gesture work, e.g. while the card is off-screen. Defaults to true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Style of the inner content container (padding, layout). */
  contentStyle?: StyleProp<ViewStyle>;
};

const REST = { x: -0.35, y: -0.45 };

/**
 * A surface with a specular glint that slides with the finger or the tilt of
 * the device, plus a rim light on the edge facing the light.
 */
export function GlintCard({
  children,
  source = 'both',
  intensity = 0.7,
  glintColor,
  tiltDegrees = 4,
  radius,
  reduceEffects = false,
  active = true,
  style,
  contentStyle,
  ...viewProps
}: GlintCardProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const still = reduced || reduceEffects;
  const r = radius ?? theme.radius.xl;
  const light = glintColor ?? theme.colors.highlight;
  const k = Math.max(0, Math.min(1, intensity));
  // A white glint cannot brighten a white card. On light surfaces the light is
  // shown by shading everything it does not hit, as on glossy paper.
  const paper = theme.scheme === 'light' && !glintColor;
  const shade = theme.colors.text;

  const tilt = useTilt();
  const touching = useSharedValue(false);
  const touch = useSharedValue({ x: 0, y: 0 });
  const lx = useSharedValue(REST.x);
  const ly = useSharedValue(REST.y);
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });

  const followTouch = source !== 'tilt';
  const followTilt = source !== 'touch';
  const live = active && !still;

  // Pick the light target on the UI thread and ease toward it.
  useAnimatedReaction(
    () => {
      if (!live) return REST;
      if (touching.get() && followTouch) return touch.get();
      if (followTilt) return { x: REST.x + tilt.x.get() * 0.9, y: REST.y + tilt.y.get() * 0.9 };
      return REST;
    },
    (target, previous) => {
      if (previous && target.x === previous.x && target.y === previous.y) return;
      const fast = touching.get();
      lx.set(withSpring(target.x, spring(fast ? 'snappy' : 'smooth')));
      ly.set(withSpring(target.y, spring(fast ? 'snappy' : 'smooth')));
    },
    [live, followTouch, followTilt],
  );

  const gesture = Gesture.Manual()
    .withTestId('glint-card-touch')
    .enabled(live && followTouch)
    .onTouchesDown((e) => {
      const t = e.allTouches[0];
      const { width, height } = size.get();
      if (!t || width === 0 || height === 0) return;
      touch.set({ x: (t.x / width) * 2 - 1, y: (t.y / height) * 2 - 1 });
      touching.set(true);
    })
    .onTouchesMove((e) => {
      const t = e.allTouches[0];
      const { width, height } = size.get();
      if (!t || width === 0 || height === 0) return;
      touch.set({
        x: Math.max(-1.2, Math.min(1.2, (t.x / width) * 2 - 1)),
        y: Math.max(-1.2, Math.min(1.2, (t.y / height) * 2 - 1)),
      });
    })
    .onTouchesUp(() => {
      touching.set(false);
    })
    .onTouchesCancelled(() => {
      touching.set(false);
    });

  const cardStyle = useAnimatedStyle(() => {
    if (tiltDegrees === 0) return {};
    return {
      transform: [
        { perspective: 900 },
        { rotateX: `${(-(ly.get() - REST.y) * tiltDegrees).toFixed(3)}deg` },
        { rotateY: `${((lx.get() - REST.x) * tiltDegrees).toFixed(3)}deg` },
      ],
    };
  });

  const clip = useDerivedValue(() => rrect(rect(0, 0, size.get().width, size.get().height), r, r));

  // Soft hotspot where the light hits the surface.
  const hotspotCenter = useDerivedValue(() => {
    const { width, height } = size.get();
    return vec(width * (0.5 + lx.get() * 0.55), height * (0.5 + ly.get() * 0.55));
  });
  const hotspotRadius = useDerivedValue(() => Math.max(size.get().width, size.get().height) * 0.75);

  // A diagonal sheen band that sweeps across as the light moves.
  const bandStart = useDerivedValue(() => vec(0, 0));
  const bandEnd = useDerivedValue(() => vec(size.get().width, size.get().height));
  const bandPositions = useDerivedValue(() => {
    const t = Math.max(0.16, Math.min(0.84, 0.5 + lx.get() * 0.42 + ly.get() * 0.18));
    return [0, t - 0.15, t - 0.03, t, t + 0.03, t + 0.15, 1];
  });

  // Rim light: brighter on the edge facing the light.
  const rimStart = useDerivedValue(() => {
    const { width, height } = size.get();
    return vec(width * (0.5 + lx.get() * 0.5), height * (0.5 + ly.get() * 0.5));
  });
  const rimEnd = useDerivedValue(() => {
    const { width, height } = size.get();
    return vec(width * (0.5 - lx.get() * 0.5), height * (0.5 - ly.get() * 0.5));
  });
  const rimRect = useDerivedValue(() =>
    rrect(rect(0.5, 0.5, size.get().width - 1, size.get().height - 1), r - 0.5, r - 0.5),
  );

  const clear = withAlpha(light, 0);
  const bandColors = [
    clear,
    clear,
    withAlpha(light, 0.1 * k),
    withAlpha(light, 0.26 * k),
    withAlpha(light, 0.1 * k),
    clear,
    clear,
  ];
  const unlit = withAlpha(shade, 0);
  const dim = withAlpha(shade, 0.07 * k);
  const shadeColors = [
    dim,
    dim,
    withAlpha(shade, 0.025 * k),
    unlit,
    withAlpha(shade, 0.025 * k),
    dim,
    dim,
  ];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        collapsable={false}
        {...viewProps}
        style={[
          styles.card,
          {
            borderRadius: r,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            boxShadow: theme.shadow.md,
          },
          style,
          cardStyle,
        ]}
      >
        <View style={[styles.content, { padding: theme.space[5] }, contentStyle]}>{children}</View>
        <Canvas
          style={StyleSheet.absoluteFill}
          onSize={size}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {paper ? (
            <Group clip={clip} blendMode="multiply">
              <RoundedRect rect={clip}>
                <RadialGradient c={hotspotCenter} r={hotspotRadius} colors={[unlit, dim]} />
              </RoundedRect>
              <RoundedRect rect={clip}>
                <LinearGradient
                  start={bandStart}
                  end={bandEnd}
                  colors={shadeColors}
                  positions={bandPositions}
                />
              </RoundedRect>
            </Group>
          ) : (
            <Group clip={clip} blendMode="screen">
              <RoundedRect rect={clip}>
                <RadialGradient
                  c={hotspotCenter}
                  r={hotspotRadius}
                  colors={[withAlpha(light, 0.16 * k), clear]}
                />
              </RoundedRect>
              <RoundedRect rect={clip}>
                <LinearGradient
                  start={bandStart}
                  end={bandEnd}
                  colors={bandColors}
                  positions={bandPositions}
                />
              </RoundedRect>
            </Group>
          )}
          <RoundedRect rect={rimRect} style="stroke" strokeWidth={1}>
            <LinearGradient
              start={rimStart}
              end={rimEnd}
              colors={
                paper
                  ? // The edge facing away from the light falls into shadow.
                    [withAlpha(shade, 0.02 * k), withAlpha(shade, 0.22 * k)]
                  : [withAlpha(light, 0.55 * k), withAlpha(light, 0.04 * k)]
              }
            />
          </RoundedRect>
        </Canvas>
        {live && followTilt && <TiltSensor target={tilt} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: {
    flexGrow: 1,
  },
});
