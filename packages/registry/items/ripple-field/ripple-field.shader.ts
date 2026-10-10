/**
 * A dot grid displaced by up to four expanding ripples.
 * Uniforms: res, time, ripple origins/start times (r0–r3: x, y, start),
 * spacing (pt), strength (0–1), base / dot / accent colours.
 */
export const RIPPLE_SHADER = `
uniform float2 res;
uniform float time;
uniform float3 r0;
uniform float3 r1;
uniform float3 r2;
uniform float3 r3;
uniform float spacing;
uniform float strength;
uniform half4 base;
uniform half4 dotColor;
uniform half4 accent;

const float LIFE = 2.4;
const float SPEED = 340.0;

// Displacement (xy) and glow (z) contributed by one ripple at point p.
float3 ripple(float2 p, float3 r) {
  float age = time - r.z;
  if (age < 0.0 || age > LIFE) return float3(0.0);
  float2 dir = p - r.xy;
  float d = length(dir);
  float x = d - age * SPEED;
  float fade = 1.0 - age / LIFE;
  float env = exp(-(x * x) / 1800.0) * fade * fade;
  float wave = sin(x * 0.09) * env;
  float2 n = d > 0.001 ? dir / d : float2(0.0);
  return float3(n * wave * 14.0 * strength, env);
}

half4 main(float2 xy) {
  float3 a = ripple(xy, r0) + ripple(xy, r1) + ripple(xy, r2) + ripple(xy, r3);
  float2 q = xy - a.xy;
  float glow = clamp(a.z, 0.0, 1.0);

  float2 cell = (fract(q / spacing) - 0.5) * spacing;
  float d = length(cell);
  float radius = 1.3 + glow * 1.6;
  float dotMask = smoothstep(radius + 0.8, radius - 0.4, d);

  half3 col = base.rgb;
  half3 dotRgb = mix(dotColor.rgb, accent.rgb, glow);
  col = mix(col, dotRgb, dotMask * (0.55 + 0.45 * glow));
  // A faint tint travels with each wave front.
  col = mix(col, accent.rgb, glow * 0.08);
  return half4(col, 1.0);
}
`;
