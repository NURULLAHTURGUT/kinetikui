import { Canvas, Fill, Shader, type SkSize } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { useReduceMotion } from '../../lib/kinetik/hooks/use-reduce-motion';
import { useShaderClock } from '../../lib/kinetik/hooks/use-shader-clock';
import { colorUniform, runtimeEffect } from '../../lib/kinetik/shaders/sksl';
import { useKinetikTheme } from '../../lib/kinetik/tokens/theme';
import { AURORA_SHADER } from './aurora-veil.shader';

export type AuroraVeilProps = {
  /** Content drawn on top of the aurora. */
  children?: ReactNode;
  /** Ribbon colours, back to front. Defaults to ice, textSubtle and ember from the theme. */
  colors?: [string, string, string];
  /** Ground colour behind the ribbons. Defaults to the theme background. */
  baseColor?: string;
  /** Strength of the ribbons, 0–1. Defaults to 0.85. */
  intensity?: number;
  /** Animation speed multiplier. Defaults to 1. */
  speed?: number;
  /** Shader updates per second. 30 halves the GPU cost on weaker devices. Defaults to 60. */
  frameRate?: 60 | 30;
  /** Draw a single still frame: no per-frame work. Reduced-motion users always get this. */
  reduceEffects?: boolean;
  /** Pause the animation, e.g. while the screen is off-screen. Defaults to true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A slow, flowing aurora drawn by a fragment shader. Use it as a screen or
 * hero background; children render on top.
 */
export function AuroraVeil({
  children,
  colors,
  baseColor,
  intensity = 0.85,
  speed = 1,
  frameRate = 60,
  reduceEffects = false,
  active = true,
  style,
}: AuroraVeilProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const still = reduced || reduceEffects;
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  // Still frames start a few seconds in, where the ribbons are well formed.
  const time = useShaderClock({ running: active && !still, speed, frameRate, start: 4 });

  const [a, b, c] = colors ?? [theme.colors.ice, theme.colors.textSubtle, theme.colors.ember];
  const base = colorUniform(baseColor ?? theme.colors.background);
  const c0 = colorUniform(a);
  const c1 = colorUniform(b);
  const c2 = colorUniform(c);
  const k = Math.max(0, Math.min(1, intensity));

  const uniforms = useDerivedValue(() => ({
    res: [size.get().width, size.get().height],
    time: time.get(),
    intensity: k,
    base,
    c0,
    c1,
    c2,
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
            <Shader source={runtimeEffect(AURORA_SHADER)} uniforms={uniforms} />
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
