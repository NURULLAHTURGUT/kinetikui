import { NOISE } from '../../lib/kinetik/shaders/sksl';

/**
 * Three aurora ribbons that sway and shimmer over a base colour.
 * Uniforms: res (px), time (s), intensity (0–1), base + three ribbon colours.
 */
export const AURORA_SHADER = `
uniform float2 res;
uniform float time;
uniform float intensity;
uniform half4 base;
uniform half4 c0;
uniform half4 c1;
uniform half4 c2;
${NOISE}

float ribbon(float y, float center, float width) {
  float d = (y - center) / width;
  return exp(-d * d);
}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float aspect = res.x / max(res.y, 1.0);
  float x = uv.x * aspect;
  float t = time * 0.12;

  // Slow domain warp gives the curtains their drift.
  float warp = fbm(float2(x * 1.3 + t, uv.y * 0.8 - t * 0.6));
  float sway = warp * 0.35;

  // Fine vertical rays, like light through the curtain.
  float rays = 0.55 + 0.45 * fbm(float2(x * 9.0 + warp * 2.0, t * 1.6));

  float r0 = ribbon(uv.y, 0.30 + 0.10 * sin(x * 2.2 + t * 2.6) + sway * 0.2, 0.10) * rays;
  float r1 = ribbon(uv.y, 0.46 + 0.08 * sin(x * 1.6 - t * 2.1 + 1.7) + sway * 0.25, 0.13) * rays;
  float r2 = ribbon(uv.y, 0.22 + 0.12 * sin(x * 2.9 + t * 1.4 + 3.1) - sway * 0.15, 0.07) * rays;

  half3 col = base.rgb;
  col = mix(col, c0.rgb, clamp(r0 * intensity, 0.0, 1.0));
  col = mix(col, c1.rgb, clamp(r1 * intensity * 0.85, 0.0, 1.0));
  col = mix(col, c2.rgb, clamp(r2 * intensity * 0.75, 0.0, 1.0));

  // Fade back into the base towards the bottom so content stays legible.
  col = mix(col, base.rgb, smoothstep(0.45, 1.0, uv.y) * 0.85);
  return half4(col, 1.0);
}
`;
