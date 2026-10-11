import { Canvas, Fill, Shader, type SkSize } from '@shopify/react-native-skia';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../lib/kinetik/hooks/use-haptic';
import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { colorUniform, runtimeEffect } from '../../lib/kinetik/shaders/sksl';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { RIPPLE_SHADER } from './ripple-field.shader';

export type RippleFieldProps = {
  children?: ReactNode;
  /** Distance between grid dots, in pt. Defaults to 18. */
  spacing?: number;
  /** How far the waves push the dots, 0–1. Defaults to 0.8. */
  strength?: number;
  /** Colour of the wave fronts. Defaults to the theme ice. */
  accentColor?: string;
  /** A light tap on each touch. Defaults to false. */
  haptics?: boolean;
  /** Static grid with no ripples. Reduced-motion users always get this. */
  reduceEffects?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LIFE_MS = 2500;
type Ripple = [number, number, number];
const OFF: Ripple = [0, 0, -100];

/**
 * A dot-grid surface that ripples outward from every touch. Up to four waves
 * overlap. The shader only animates while a wave is alive; at rest it costs
 * nothing per frame. Touches never claim the gesture, so it can sit under
 * scrolling content.
 */
export function RippleField({
  children,
  spacing = 18,
  strength = 0.8,
  accentColor,
  haptics = false,
  reduceEffects = false,
  style,
}: RippleFieldProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const still = reduced || reduceEffects;
  const haptic = useHaptic(haptics);
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const [awake, setAwake] = useState(false);
  const [touches, setTouches] = useState(0);
  const time = useShaderClock({ running: awake && !still });
  const ripples = useSharedValue<Ripple[]>([OFF, OFF, OFF, OFF]);
  const next = useSharedValue(0);

  // Keep the clock running until the last wave has faded, then stop it.
  useEffect(() => {
    if (touches === 0) return;
    const t = setTimeout(() => setAwake(false), LIFE_MS);
    return () => clearTimeout(t);
  }, [touches]);

  const wake = () => {
    setAwake(true);
    setTouches((n) => n + 1);
    haptic('tap');
  };

  const gesture = Gesture.Manual()
    .withTestId('ripple-field')
    .enabled(!still)
    .onTouchesDown((e) => {
      const list = ripples.get().slice();
      for (const t of e.changedTouches) {
        list[next.get() % 4] = [t.x, t.y, time.get()];
        next.set(next.get() + 1);
      }
      ripples.set(list);
      scheduleOnRN(wake);
    });

  const base = colorUniform(theme.colors.background);
  const dot = colorUniform(theme.colors.textSubtle);
  const accent = colorUniform(accentColor ?? theme.colors.ice);
  const k = Math.max(0, Math.min(1, strength));

  const uniforms = useDerivedValue(() => {
    const r = ripples.get();
    return {
      res: [size.get().width, size.get().height],
      time: time.get(),
      r0: r[0] ?? OFF,
      r1: r[1] ?? OFF,
      r2: r[2] ?? OFF,
      r3: r[3] ?? OFF,
      spacing,
      strength: k,
      base,
      dotColor: dot,
      accent,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={[styles.root, style]}>
        {/* Hidden from touch and screen readers on the wrapper: on the web the canvas ignores these props. */}
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Canvas style={StyleSheet.absoluteFill} onSize={size}>
            <Fill>
              <Shader source={runtimeEffect(RIPPLE_SHADER)} uniforms={uniforms} />
            </Fill>
          </Canvas>
        </View>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
