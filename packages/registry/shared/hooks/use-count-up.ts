import { useEffect, useRef, useState } from 'react';

export type CountUpOptions = {
  /** Length of the count in ms. Defaults to 900. */
  duration?: number;
  /** Jump straight to the target, as with reduced motion. */
  instant?: boolean;
  /** Where the first count starts from. Defaults to 0. */
  from?: number;
};

/**
 * A number that counts towards `target` with an ease-out curve, for figures
 * shown as text. Later targets count on from wherever the number is, so an
 * interrupted count never jumps back.
 *
 * Text cannot be animated on the UI thread, so this re-renders on animation
 * frames; it runs only while counting.
 */
export function useCountUp(
  target: number,
  { duration = 900, instant = false, from = 0 }: CountUpOptions = {},
): number {
  const [value, setValue] = useState(instant ? target : from);
  const current = useRef(value);

  useEffect(() => {
    const start = current.current;
    if (instant || start === target || duration <= 0) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    // Checked on every frame too: cancelAnimationFrame is not reliable in every environment.
    let cancelled = false;
    const began = Date.now();
    const step = () => {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - began) / duration);
      // Ease-out quint: quick to start, settling gently on the figure.
      const eased = 1 - (1 - t) ** 5;
      const next = start + (target - start) * eased;
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, duration, instant]);

  return value;
}
