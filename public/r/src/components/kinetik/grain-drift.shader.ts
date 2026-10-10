import { NOISE } from '../../lib/kinetik/shaders/sksl';

/**
 * A mesh gradient of four colour points drifting on slow orbits, under a
 * moving film grain. Uniforms: res, time, grain (0–1), four colours.
 */
export const GRAIN_SHADER = `
uniform float2 res;
uniform float time;
uniform float grain;
uniform half4 c0;
uniform half4 c1;
uniform half4 c2;
uniform half4 c3;
${NOISE}

float2 orbit(float2 center, float radius, float speed, float phase) {
  float a = time * speed + phase;
  return center + radius * float2(cos(a), sin(a * 1.3));
}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float aspect = res.x / max(res.y, 1.0);
  float2 p = float2(uv.x * aspect, uv.y);

  // A little noise in the lookup softens the blend into a painted look.
  p += (float2(valueNoise(p * 3.0 + time * 0.05), valueNoise(p * 3.0 - time * 0.04)) - 0.5) * 0.12;

  float2 a = orbit(float2(0.25 * aspect, 0.25), 0.18, 0.21, 0.0);
  float2 b = orbit(float2(0.80 * aspect, 0.30), 0.20, 0.17, 2.1);
  float2 c = orbit(float2(0.30 * aspect, 0.80), 0.22, 0.13, 4.0);
  float2 d = orbit(float2(0.75 * aspect, 0.75), 0.16, 0.19, 5.3);

  // Inverse-distance weights: each point owns the area around it.
  float wa = 1.0 / pow(distance(p, a) + 0.05, 2.2);
  float wb = 1.0 / pow(distance(p, b) + 0.05, 2.2);
  float wc = 1.0 / pow(distance(p, c) + 0.05, 2.2);
  float wd = 1.0 / pow(distance(p, d) + 0.05, 2.2);
  half3 col = (c0.rgb * wa + c1.rgb * wb + c2.rgb * wc + c3.rgb * wd) / (wa + wb + wc + wd);

  // Film grain re-seeded at 24 fps, like real film.
  float frame = floor(time * 24.0);
  float g = hash21(xy + frame * 17.0) - 0.5;
  col += g * grain * 0.16;
  return half4(col, 1.0);
}
`;
