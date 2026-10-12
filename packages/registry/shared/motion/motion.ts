import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Kinetik motion vocabulary.
 *
 * Every animated value in every component picks one of these presets. No
 * component invents its own spring constants or durations — that is what makes
 * a screen full of Kinetik parts feel like one system.
 *
 *  - snappy  (keskin):  UI feedback — presses, toggles, indicators. Barely overshoots.
 *  - smooth  (yumuşak): Layout and position changes — sheets, cards, reveals.
 *  - bouncy  (esnek):   Playful, physical moments — release, snap-back, celebration.
 */
export const springs = {
  snappy: { mass: 1, stiffness: 520, damping: 38 },
  smooth: { mass: 1, stiffness: 210, damping: 27 },
  bouncy: { mass: 1, stiffness: 260, damping: 13 },
} as const satisfies Record<string, WithSpringConfig>;

export type SpringName = keyof typeof springs;

/** Duration tiers in milliseconds. */
export const durations = {
  quick: 140,
  base: 260,
  slow: 480,
} as const;

export type DurationName = keyof typeof durations;

export const easings = {
  /** Default for anything entering or changing on screen. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Exits and dismissals: accelerate away. */
  exit: Easing.bezier(0.4, 0, 1, 1),
  /** Continuous loops (shimmer, drift). */
  linear: Easing.linear,
  /** Symmetric loops that breathe in and out. */
  inOut: Easing.inOut(Easing.sin),
} as const;

export type EasingName = keyof typeof easings;

/**
 * Spring config for a preset. When `reduced` is true the animation jumps to its
 * final value, so state still changes but nothing moves. Kinetik owns the
 * reduce-motion decision (system setting or provider override, see
 * `useReduceMotion`), so presets never defer to Reanimated's own system check.
 */
export function spring(name: SpringName, reduced = false, velocity?: number): WithSpringConfig {
  'worklet';
  const base = springs[name];
  return {
    ...base,
    ...(velocity === undefined ? null : { velocity }),
    reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.Never,
  };
}

/** Timing config for a duration tier and easing. */
export function timing(
  duration: DurationName,
  reduced = false,
  easing: EasingName = 'standard',
): WithTimingConfig {
  'worklet';
  return {
    duration: durations[duration],
    easing: easings[easing],
    reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.Never,
  };
}
