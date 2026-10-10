import { Canvas, Path, RadialGradient, Skia, vec, type SkSize } from '@shopify/react-native-skia';
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
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';

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

  // The blades: the whole card minus a rotating polygon that grows with
  // progress, plus a seam along each blade edge.
  const blade = useDerivedValue(() => {
    const { width, height } = size.get();
    const p = reduced ? 0 : progress.get();
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.sqrt(cx * cx + cy * cy) * 1.25;
    const radiusNow = p * reach;
    const turn = (1 - p) * (Math.PI / 2.2);
    const path = Skia.Path.Make();
    path.addRect({ x: 0, y: 0, width, height });
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * radiusNow;
      const y = cy + Math.sin(a) * radiusNow;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.close();
    path.setFillType(1); // EvenOdd: rect minus the aperture
    return path;
  });

  const seams = useDerivedValue(() => {
    const { width, height } = size.get();
    const p = reduced ? 0 : progress.get();
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.sqrt(cx * cx + cy * cy) * 1.25;
    const radiusNow = Math.max(2, p * reach);
    const turn = (1 - p) * (Math.PI / 2.2);
    const path = Skia.Path.Make();
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2;
      const b = turn + ((i + 1) / n) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * radiusNow;
      const y0 = cy + Math.sin(a) * radiusNow;
      // Each seam runs along the polygon edge and on past the corner.
      const dx = Math.cos(b) * radiusNow + cx - x0;
      const dy = Math.sin(b) * radiusNow + cy - y0;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      path.moveTo(x0, y0);
      path.lineTo(x0 + (dx / len) * reach * 2, y0 + (dy / len) * reach * 2);
    }
    return path;
  });

  const center = useDerivedValue(() => vec(size.get().width / 2, size.get().height / 2));
  const shadeRadius = useDerivedValue(() =>
    Math.max(1, Math.max(size.get().width, size.get().height) * 0.75),
  );

  const canvasStyle = useAnimatedStyle(() => ({
    // Reduced motion: the blades fade instead of turning.
    opacity: reduced ? 1 - progress.get() : progress.get() > 0.995 ? 0 : 1,
  }));
  const coverStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.get() * 3),
    transform: [{ scale: 1 - progress.get() * 0.15 }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && toggleOnPress) toggle();
  };

  const bladeColor = theme.colors.surfaceRaised;

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
            {/* Opaque blades, then a soft shade so they read as curved metal. */}
            <Path path={blade} color={bladeColor} />
            <Path path={blade}>
              <RadialGradient
                c={center}
                r={shadeRadius}
                colors={[
                  withAlpha(theme.colors.highlight, 0.06),
                  withAlpha(theme.colors.surfaceSunken, 0.85),
                ]}
              />
            </Path>
            <Path
              path={seams}
              style="stroke"
              strokeWidth={1.25}
              color={withAlpha(theme.colors.highlight, 0.14)}
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

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, minHeight: 200 },
  content: { flexGrow: 1 },
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
