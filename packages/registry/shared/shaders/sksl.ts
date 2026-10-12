import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

/**
 * SkSL helpers shared by Kinetik's shaders: hashing, value noise and fbm.
 * Paste `NOISE` above `half4 main(...)` in a shader source.
 */
export const NOISE = `
// Sin-free hash (no visible lattice, stable across GPUs).
float hash21(float2 p) {
  float3 p3 = fract(float3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * valueNoise(p);
    p = p * 2.03 + float2(17.1, 9.2);
    amp *= 0.5;
  }
  return v;
}
`;

const cache = new Map<string, SkRuntimeEffect>();

/**
 * Compiles a shader once and reuses it. Compilation is deferred to first use
 * so importing a component never touches Skia before it is ready (on the web,
 * CanvasKit loads asynchronously).
 */
export function runtimeEffect(source: string): SkRuntimeEffect {
  let effect = cache.get(source);
  if (!effect) {
    const made = Skia.RuntimeEffect.Make(source);
    if (!made) throw new Error('Kinetik: shader failed to compile');
    effect = made;
    cache.set(source, effect);
  }
  return effect;
}

/** A colour token as a premultiplication-free [r, g, b, a] uniform (0–1). */
export function colorUniform(color: string): [number, number, number, number] {
  const c = Skia.Color(color);
  return [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 1];
}
