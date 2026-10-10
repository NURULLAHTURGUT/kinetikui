import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

export type ShaderClockOptions = {
  /** Advance the clock. Pass false while off-screen or when effects are reduced. */
  running: boolean;
  /** Time multiplier. Defaults to 1. */
  speed?: number;
  /** 60 updates per second, or 30 to halve the GPU work of heavy shaders. Defaults to 60. */
  frameRate?: 60 | 30;
  /** Seconds the clock starts at (and holds at while stopped). Defaults to 0. */
  start?: number;
};

/**
 * Seconds elapsed for a shader, advanced on the UI thread by a frame callback.
 * Stops completely (no per-frame work) while `running` is false.
 */
export function useShaderClock({
  running,
  speed = 1,
  frameRate = 60,
  start = 0,
}: ShaderClockOptions): SharedValue<number> {
  const time = useSharedValue(start);
  const pending = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    const dt = Math.min(0.1, (info.timeSincePreviousFrame ?? 16) / 1000);
    if (frameRate === 30) {
      // Accumulate and publish every other frame.
      const acc = pending.get() + dt;
      if (acc < 1 / 45) {
        pending.set(acc);
        return;
      }
      pending.set(0);
      time.set(time.get() + acc * speed);
      return;
    }
    time.set(time.get() + dt * speed);
  }, false);

  useEffect(() => {
    frame.setActive(running);
    // `frame` is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return time;
}
