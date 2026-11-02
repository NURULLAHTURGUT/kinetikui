import { NOISE } from '../../lib/kinetik/shaders/sksl';

/**
 * Noise that repeats across `per` cells, so a layer can slide by exactly one
 * period and start over without a seam. Clouds billow when the noise is sampled
 * through more noise.
 */
const TILING = `
${NOISE}

float tileNoise(float2 p, float per) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, per);
  float x1 = mod(i.x + 1.0, per);
  float a = hash21(float2(x0, i.y));
  float b = hash21(float2(x1, i.y));
  float c = hash21(float2(x0, i.y + 1.0));
  float d = hash21(float2(x1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float tileFbm(float2 p, float per) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    v += amp * tileNoise(p, per);
    p = p * 2.0 + float2(0.0, 5.3);
    per *= 2.0;
    amp *= 0.5;
  }
  return v;
}

float billow(float2 p, float per) {
  float2 warp = float2(tileFbm(p + float2(3.0, 7.7), per), tileFbm(p + float2(8.0, 2.8), per));
  return tileFbm(p + warp * 1.5, per);
}

// Density, and how much light reaches it from up and to the right.
float2 deck(float2 p, float per, float lo, float hi) {
  float d = billow(p, per);
  float shade = d - billow(p + float2(0.12, -0.2), per);
  return float2(smoothstep(lo, hi, d), shade);
}
`;

/** The far cloud deck over the night sky. Opaque; `period` is its repeat in points. */
export const FAR_CLOUDS = `
uniform float2 res;
uniform float period;
${TILING}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float2 far = deck(float2(xy.x / period * 6.0, uv.y * 3.4 + 2.0), 6.0, 0.42, 0.72);
  float3 sky = mix(float3(0.05, 0.07, 0.1), float3(0.1, 0.135, 0.19), uv.y);
  float3 color = mix(sky, float3(0.21, 0.255, 0.32), far.x);
  color += float3(0.82, 0.9, 1.02) * max(far.y, 0.0) * far.x;
  return half4(color, 1.0);
}
`;

/** The near cloud bank, building towards the bottom. Transparent elsewhere. */
export const NEAR_CLOUDS = `
uniform float2 res;
uniform float period;
${TILING}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float2 near = deck(float2(xy.x / period * 7.0, uv.y * 4.0 + 9.0), 7.0, 0.42, 0.62);
  float cover = near.x * smoothstep(0.26, 0.86, uv.y);
  float3 color = float3(0.25, 0.3, 0.365) + float3(0.95, 1.02, 1.12) * max(near.y, 0.0);
  return half4(color * cover, cover);
}
`;

/** Thin wisps that race past in front of the plane. */
export const WISPS = `
uniform float2 res;
uniform float period;
${TILING}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float d = tileFbm(float2(xy.x / period * 3.0, uv.y * 5.5 + 4.0), 3.0);
  float a = smoothstep(0.52, 0.78, d) * 0.5;
  a *= smoothstep(0.3, 0.5, uv.y) * (1.0 - smoothstep(0.62, 0.8, uv.y));
  return half4(float3(0.62, 0.68, 0.76) * a, a);
}
`;
