import {
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
  SensorType,
  type SharedValue,
} from 'react-native-reanimated';

export type Tilt = {
  /** Left/right tilt, -1 (left) … 1 (right). */
  x: SharedValue<number>;
  /** Toward/away tilt relative to how the device was held, -1 (away) … 1 (toward). */
  y: SharedValue<number>;
};

/** Shared values that a `TiltSensor` (or a gesture) writes into. */
export function useTilt(): Tilt {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  return { x, y };
}

export type TiltSensorProps = {
  target: Tilt;
  /** Device angle, in degrees, that maps to a full ±1 tilt. Defaults to 22°. */
  range?: number;
  /** Sensor sample interval in ms. Defaults to 16 (≈60 Hz). */
  interval?: number;
};

const G = 9.81;
/** ±1 tilt spans the card's light travel, so 0.004 moves the glint well under a pixel. */
const DEADBAND = 0.004;

type Vec = { x: number; y: number };

/**
 * One sensor sample: returns the new neutral pose and the tilt to write, or
 * `null` for an axis whose change is too small to see.
 */
export function tiltStep(g: Vec, baseline: Vec | null, x: number, y: number, span: number) {
  'worklet';
  // Gravity in device axes, normalised to ±1 g.
  const gx = Math.max(-1, Math.min(1, g.x / G));
  const gy = Math.max(-1, Math.min(1, g.y / G));
  if (baseline === null) return { baseline: { x: gx, y: gy }, x: null, y: null };
  // Low-pass the neutral pose so a change of grip recentres within ~2 s.
  const next = {
    x: baseline.x + (gx - baseline.x) * 0.01,
    y: baseline.y + (gy - baseline.y) * 0.01,
  };
  // Skip sub-perceptual changes so a device at rest (where sensor noise and
  // the recentring drift never settle exactly) stops redrawing.
  const nx = Math.max(-1, Math.min(1, (gx - baseline.x) / span));
  const ny = Math.max(-1, Math.min(1, (gy - baseline.y) / span));
  return {
    baseline: next,
    x: Math.abs(nx - x) > DEADBAND ? nx : null,
    y: Math.abs(ny - y) > DEADBAND ? ny : null,
  };
}

/**
 * Feeds device tilt into a `Tilt` on the UI thread. Render it only while the
 * effect is visible — unmounting it unregisters the sensor:
 *
 *   {active && <TiltSensor target={tilt} />}
 *
 * The neutral pose recentres slowly to however the user is holding the
 * device, so the effect always starts from rest.
 */
export function TiltSensor({ target, range = 22, interval = 16 }: TiltSensorProps) {
  const sensor = useAnimatedSensor(SensorType.GRAVITY, { interval });
  const baseline = useSharedValue<{ x: number; y: number } | null>(null);
  const span = Math.sin((Math.min(Math.max(range, 5), 80) * Math.PI) / 180);

  useAnimatedReaction(
    () => sensor.sensor.get(),
    (g) => {
      const next = tiltStep(g, baseline.get(), target.x.get(), target.y.get(), span);
      baseline.set(next.baseline);
      if (next.x !== null) target.x.set(next.x);
      if (next.y !== null) target.y.set(next.y);
    },
  );

  return null;
}
