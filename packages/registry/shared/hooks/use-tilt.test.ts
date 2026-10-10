import { tiltStep } from './use-tilt';

const G = 9.81;
const span = Math.sin((22 * Math.PI) / 180);

describe('tiltStep', () => {
  it('takes the first sample as the neutral pose without moving', () => {
    const r = tiltStep({ x: 2, y: -3 }, null, 0, 0, span);
    expect(r.baseline).toEqual({ x: 2 / G, y: -3 / G });
    expect(r.x).toBeNull();
    expect(r.y).toBeNull();
  });

  it('maps a tilt away from the neutral pose to ±1, clamped', () => {
    const r = tiltStep({ x: G, y: 0 }, { x: 0, y: 0 }, 0, 0, span);
    expect(r.x).toBe(1);
    expect(r.y).toBeNull();
  });

  it('writes nothing for a device at rest with sensor noise', () => {
    let state = tiltStep({ x: 0.5, y: 0.5 }, null, 0, 0, span);
    let x = 0;
    let y = 0;
    let writes = 0;
    for (let i = 0; i < 300; i++) {
      const noise = (i % 2 ? 1 : -1) * 0.003; // m/s², typical gravity sensor jitter
      const r = tiltStep({ x: 0.5 + noise, y: 0.5 - noise }, state.baseline, x, y, span);
      if (r.x !== null) {
        x = r.x;
        writes++;
      }
      if (r.y !== null) {
        y = r.y;
        writes++;
      }
      state = r;
    }
    expect(writes).toBe(0);
  });
});
