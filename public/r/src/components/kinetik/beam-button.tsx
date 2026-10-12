import {
  BlurMask,
  Canvas,
  Group,
  RoundedRect,
  SweepGradient,
  rect,
  rrect,
  vec,
  type SkSize,
} from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
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
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { spring } from '../../lib/kinetik/motion/motion';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { minTouchTarget, withAlpha } from '../../lib/kinetik/tokens/tokens';

export type BeamButtonProps = {
  /** Label. A string gets the variant's text style; any node is rendered as is. */
  children: ReactNode;
  onPress?: () => void;
  /** Icon before the label. */
  leading?: ReactNode;
  /** `surface` is quiet and dark; `ember` is the filled primary. Defaults to `surface`. */
  variant?: 'surface' | 'ember';
  /** Colour of the travelling light. Defaults to the strongest ink that reads on the variant. */
  beamColor?: string;
  /** Seconds for the light to go once around. Defaults to 3.2. */
  lap?: number;
  /** Corner radius. Defaults to the theme `md` radius. */
  radius?: number;
  disabled?: boolean;
  /** A light tap on press. Defaults to true. */
  haptics?: boolean;
  /** Required when `children` is not a string. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** How far the glow may spread past the button's edge. */
const BLEED = 14;
const HEIGHT = 52;

/**
 * A button with a beam of light running around its edge. The beam leaves a
 * soft glow outside the button and brightens while it is pressed.
 */
export function BeamButton({
  children,
  onPress,
  leading,
  variant = 'surface',
  beamColor,
  lap = 3.2,
  radius,
  disabled = false,
  haptics = true,
  accessibilityLabel,
  style,
}: BeamButtonProps) {
  const theme = useKinetikTheme();
  const { colors, font, space } = theme;
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const dark = theme.scheme === 'dark';
  const r = radius ?? theme.radius.md;

  const fill = variant === 'ember' ? colors.ember : colors.surfaceRaised;
  const ink = variant === 'ember' ? colors.onEmber : colors.text;
  const beam =
    beamColor ?? (variant === 'ember' ? colors.ember : dark ? colors.highlight : colors.text);

  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const pressed = useSharedValue(0);
  const time = useShaderClock({ running: !reduced && !disabled });

  // The light starts at the top left and goes round once per lap.
  const turn = useDerivedValue(() => [
    { rotate: -Math.PI * 0.75 + (time.get() / Math.max(0.5, lap)) * Math.PI * 2 },
  ]);
  const center = useDerivedValue(() => vec(size.get().width / 2, size.get().height / 2));
  const edge = useDerivedValue(() => {
    const { width, height } = size.get();
    return rrect(
      rect(BLEED + 0.75, BLEED + 0.75, width - BLEED * 2 - 1.5, height - BLEED * 2 - 1.5),
      r,
      r,
    );
  });
  const glow = useDerivedValue(() => 0.45 + pressed.get() * 0.55);

  const clear = withAlpha(beam, 0);
  const beamColors = [clear, clear, withAlpha(beam, 0.9), beam, clear];
  const beamStops = [0, 0.5, 0.82, 0.95, 1];

  const press = () => {
    haptic('tap');
    onPress?.();
  };

  const tap = Gesture.Tap()
    .withTestId('beam-button')
    .enabled(!disabled)
    .maxDuration(60_000)
    .maxDistance(32)
    .onBegin(() => {
      pressed.set(withSpring(1, spring('snappy', reduced)));
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, spring('smooth', reduced)));
    })
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(press);
    });

  const body = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * (reduced ? 0.01 : 0.035) }],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && !disabled) press();
  };

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
        }
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          styles.button,
          {
            height: HEIGHT,
            minWidth: Math.max(minTouchTarget, HEIGHT * 2),
            paddingHorizontal: space[6],
            borderRadius: r,
            backgroundColor: fill,
            gap: space[2],
            opacity: disabled ? 0.45 : 1,
            boxShadow: theme.shadow.sm,
          },
          style,
          body,
        ]}
      >
        {/* Wrapped so touches pass through on the web, where the canvas ignores pointerEvents. */}
        <View
          pointerEvents="none"
          style={styles.bleed}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Canvas style={StyleSheet.absoluteFill} onSize={size}>
            <RoundedRect
              rect={edge}
              style="stroke"
              strokeWidth={1}
              color={variant === 'ember' ? 'transparent' : colors.borderStrong}
            />
            {/* Glow: the beam, thicker and blurred, spilling past the edge. */}
            <Group opacity={glow}>
              <RoundedRect rect={edge} style="stroke" strokeWidth={6}>
                <SweepGradient
                  c={center}
                  colors={beamColors}
                  positions={beamStops}
                  origin={center}
                  transform={turn}
                />
                <BlurMask blur={8} style="normal" />
              </RoundedRect>
            </Group>
            <RoundedRect rect={edge} style="stroke" strokeWidth={1.5}>
              <SweepGradient
                c={center}
                colors={beamColors}
                positions={beamStops}
                origin={center}
                transform={turn}
              />
            </RoundedRect>
          </Canvas>
        </View>
        {leading}
        {typeof children === 'string' ? (
          <Text
            numberOfLines={1}
            style={{
              color: ink,
              fontSize: font.size.md,
              fontWeight: font.weight.semibold,
              letterSpacing: -0.1,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  bleed: { position: 'absolute', top: -BLEED, left: -BLEED, right: -BLEED, bottom: -BLEED },
});
