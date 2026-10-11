import {
  Canvas,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
  type SkPath,
  type SkSize,
} from '@shopify/react-native-skia';
import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { spring, timing } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { withAlpha } from '../../lib/kinetik/tokens/tokens';

export type ApertureCardProps = {
  /** Content revealed when the aperture opens. */
  children: ReactNode;
  /** Shown on the closed blades, e.g. a label or icon. */
  cover?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial state when uncontrolled. Defaults to false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Number of iris blades, 5–9. Defaults to 7. */
  blades?: number;
  /** Toggle on tap. Defaults to true. */
  toggleOnPress?: boolean;
  /** A tap when the aperture finishes opening. Defaults to true. */
  haptics?: boolean;
  /** Accessible name of the card. */
  accessibilityLabel?: string;
  /** Corner radius. Defaults to the theme `xl` radius. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A card closed by a camera-like iris. Tapping it turns the blades and opens
 * the aperture outward, revealing the content beneath.
 */
export function ApertureCard({
  children,
  cover,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  blades = 7,
  toggleOnPress = true,
  haptics = true,
  accessibilityLabel,
  radius,
  style,
}: ApertureCardProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlled ?? internal;
  const r = radius ?? theme.radius.xl;
  const n = Math.max(5, Math.min(9, Math.round(blades)));

  const progress = useSharedValue(open ? 1 : 0);
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });

  const landed = () => haptic('tap');
  useEffect(() => {
    const target = open ? 1 : 0;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished && target === 1) scheduleOnRN(landed);
    };
    progress.set(
      reduced
        ? withTiming(target, timing('base', true), done)
        : withSpring(target, { ...spring('smooth'), overshootClamping: true }, done),
    );
    // `landed` only plays a haptic; it does not need to retrigger the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced, progress]);

  const toggle = () => {
    const next = !open;
    if (controlled === undefined) setInternal(next);
    onOpenChange?.(next);
  };

  const tap = Gesture.Tap()
    .withTestId('aperture-card')
    .enabled(toggleOnPress)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(toggle);
    });

  // Shared geometry of the iris: centre, aperture radius and how far the blades
  // have turned. Fully open, the aperture's inscribed circle covers the corners.
  const iris = useDerivedValue<Iris>(() => {
    const { width, height } = size.get();
    const p = reduced ? 0 : progress.get();
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.sqrt(cx * cx + cy * cy) / Math.cos(Math.PI / n) + 2;
    return { cx, cy, rho: p * reach, turn: (1 - p) * TURN, far: reach * 1.7 + 16, width, height };
  });

  // Everything the blades cover: the card minus the aperture polygon.
  const covered = useDerivedValue(() => {
    const { cx, cy, rho, turn, width, height } = iris.get();
    const path = Skia.Path.Make();
    path.addRect({ x: 0, y: 0, width, height });
    path.addPath(aperturePath(cx, cy, rho, turn, n));
    path.setFillType(1); // EvenOdd: rect minus the aperture
    return path;
  });
  const rim = useDerivedValue(() => {
    const { cx, cy, rho, turn } = iris.get();
    return aperturePath(cx, cy, rho, turn, n);
  });

  // The blades darken towards the opening, as if it falls away into the lens.
  const center = useDerivedValue(() => vec(iris.get().cx, iris.get().cy));
  const depth = useDerivedValue(() => {
    const { rho, width, height } = iris.get();
    return Math.max(1, rho + Math.min(width, height) * 0.55);
  });

  const canvasStyle = useAnimatedStyle(() => ({
    // Reduced motion: the blades fade instead of turning.
    opacity: reduced ? 1 - progress.get() : progress.get() > 0.995 ? 0 : 1,
  }));
  const coverStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.get() * 3),
    transform: [{ scale: 1 - progress.get() * 0.08 }],
  }));

  // Blade shading: black ink in both schemes and the theme's white highlight.
  const dark = theme.scheme === 'dark';
  const ink = dark ? theme.colors.background : theme.colors.text;
  const light = theme.colors.highlight;

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && toggleOnPress) toggle();
  };

  return (
    <GestureDetector gesture={tap}>
      <View
        collapsable={false}
        accessible
        accessibilityRole={toggleOnPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={
          toggleOnPress ? (open ? 'Closes the card' : 'Opens the card') : undefined
        }
        accessibilityState={{ expanded: open }}
        accessibilityActions={toggleOnPress ? [{ name: 'activate' }] : undefined}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.card,
          {
            borderRadius: r,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            boxShadow: theme.shadow.md,
          },
          style,
        ]}
      >
        <View
          style={styles.content}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!open}
        >
          {children}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, canvasStyle]}>
          <Canvas style={StyleSheet.absoluteFill} onSize={size}>
            <Path path={covered} color={theme.colors.surfaceRaised} />
            {Array.from({ length: n }, (_, i) => (
              <Blade
                key={i}
                index={i}
                n={n}
                iris={iris}
                ink={ink}
                light={light}
                lift={dark ? 0.13 : 0.5}
                shade={dark ? 0.55 : 0.16}
                seam={dark ? 0.55 : 0.18}
              />
            ))}
            <Path path={covered}>
              <RadialGradient
                c={center}
                r={depth}
                colors={[withAlpha(ink, dark ? 0.7 : 0.22), withAlpha(ink, 0)]}
              />
            </Path>
            <Path
              path={rim}
              style="stroke"
              strokeWidth={1.5}
              strokeJoin="round"
              color={withAlpha(light, dark ? 0.35 : 0.9)}
            />
          </Canvas>
        </Animated.View>
        {cover ? (
          <Animated.View pointerEvents="none" style={[styles.cover, coverStyle]}>
            {cover}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

type Iris = {
  cx: number;
  cy: number;
  /** Radius of the aperture polygon. */
  rho: number;
  /** Rotation of the blades, in radians; they turn as the iris opens. */
  turn: number;
  /** A distance past the card's corners, where blade edges end. */
  far: number;
  width: number;
  height: number;
};

/** How far the blades turn between closed and open. */
const TURN = Math.PI / 2.4;
/** How far each blade edge curls between the aperture and the card's edge. */
const CURL = 0.55;
/** Direction the light comes from: top left. */
const LIGHT = -Math.PI * 0.72;

function aperturePath(cx: number, cy: number, rho: number, turn: number, n: number): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rho;
    const y = cy + Math.sin(a) * rho;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.close();
  return path;
}

/**
 * One iris blade: the band between two neighbouring edges of the aperture,
 * each extended past its corner to beyond the card. Lit by its angle to the
 * light, with a bevel along its edges.
 */
function Blade({
  index,
  n,
  iris,
  ink,
  light,
  lift,
  shade,
  seam,
}: {
  index: number;
  n: number;
  iris: SharedValue<Iris>;
  ink: string;
  light: string;
  lift: number;
  shade: number;
  /** Opacity of the dark gap between blades. */
  seam: number;
}) {
  const path = useDerivedValue(() => {
    const { cx, cy, rho, turn, far } = iris.get();
    const step = (Math.PI * 2) / n;
    const a0 = turn + index * step;
    const a1 = a0 + step;
    const x0 = cx + Math.cos(a0) * rho;
    const y0 = cy + Math.sin(a0) * rho;
    const x1 = cx + Math.cos(a1) * rho;
    const y1 = cy + Math.sin(a1) * rho;
    // Directions of this blade's edge and the previous one. Taken from the
    // angles, so they stay defined when the aperture closes to a point.
    const out = a0 + step / 2 + Math.PI / 2;
    const back = a0 - step / 2 + Math.PI / 2;
    // Each edge leaves the aperture straight and curls as it goes, like the
    // curved blades of a real lens. Neighbours share the same curve.
    const blade = Skia.Path.Make();
    blade.moveTo(x0, y0);
    blade.lineTo(x1, y1);
    blade.quadTo(
      x1 + Math.cos(out) * far * 0.5,
      y1 + Math.sin(out) * far * 0.5,
      x1 + Math.cos(out + CURL) * far,
      y1 + Math.sin(out + CURL) * far,
    );
    blade.lineTo(x0 + Math.cos(back + CURL) * far, y0 + Math.sin(back + CURL) * far);
    blade.quadTo(x0 + Math.cos(back) * far * 0.5, y0 + Math.sin(back) * far * 0.5, x0, y0);
    blade.close();
    return blade;
  });

  // 1 when the blade faces the light, 0 when it faces away.
  const facing = useDerivedValue(() => {
    const a = iris.get().turn + (index + 0.5) * ((Math.PI * 2) / n) + Math.PI / 2;
    return 0.5 + 0.5 * Math.cos(a - LIGHT);
  });
  const lit = useDerivedValue(() => facing.get() * lift);
  const unlit = useDerivedValue(() => (1 - facing.get()) * shade);

  return (
    <Group>
      <Path path={path} color={light} opacity={lit} />
      <Path path={path} color={ink} opacity={unlit} />
      {/* Bevel: a light lip inside the blade, then the dark gap between blades. */}
      <Group clip={path}>
        <Path path={path} style="stroke" strokeWidth={3} color={withAlpha(light, 0.1)} />
      </Group>
      <Path
        path={path}
        style="stroke"
        strokeWidth={1}
        strokeJoin="round"
        color={withAlpha(ink, seam)}
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, minHeight: 200 },
  content: { flexGrow: 1 },
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
