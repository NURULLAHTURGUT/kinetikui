import { Canvas, Fill, Shader, type SkSize } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { colorUniform, runtimeEffect } from '../../lib/kinetik/shaders/sksl';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { GRAIN_SHADER } from './grain-drift.shader';

export type GrainDriftProps = {
  children?: ReactNode;
  /** Four mesh colours. Defaults to ember, ice, surface and background from the theme. */
  colors?: [string, string, string, string];
  /** Film grain strength, 0–1. Defaults to 0.5. Set 0 for a clean gradient. */
  grain?: number;
  /** Drift speed multiplier. Defaults to 1. */
  speed?: number;
  /** Shader updates per second. 30 halves the GPU cost. Defaults to 60. */
  frameRate?: 60 | 30;
  /** Draw a single still frame. Reduced-motion users always get this. */
  reduceEffects?: boolean;
  /** Pause while off-screen. Defaults to true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A drifting mesh gradient with moving film grain: four colour points on slow
 * orbits, blended on the GPU. Children render on top.
 */
export function GrainDrift({
  children,
  colors,
  grain = 0.5,
  speed = 1,
  frameRate = 60,
  reduceEffects = false,
  active = true,
  style,
}: GrainDriftProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const still = reduced || reduceEffects;
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const time = useShaderClock({ running: active && !still, speed, frameRate, start: 2 });

  const [p0, p1, p2, p3] = colors ?? [
    theme.colors.ember,
    theme.colors.ice,
    theme.colors.surfaceRaised,
    theme.colors.background,
  ];
  const c0 = colorUniform(p0);
  const c1 = colorUniform(p1);
  const c2 = colorUniform(p2);
  const c3 = colorUniform(p3);
  const g = Math.max(0, Math.min(1, grain));

  const uniforms = useDerivedValue(() => ({
    res: [size.get().width, size.get().height],
    time: time.get(),
    grain: g,
    c0,
    c1,
    c2,
    c3,
  }));

  return (
    <View style={[styles.root, style]}>
      {/* Hidden from touch and screen readers on the wrapper: on the web the canvas ignores these props. */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Canvas style={StyleSheet.absoluteFill} onSize={size}>
          <Fill>
            <Shader source={runtimeEffect(GRAIN_SHADER)} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
