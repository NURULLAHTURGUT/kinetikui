import { ReduceMotion } from 'react-native-reanimated';

import { durations, spring, springs, timing } from './motion';

describe('motion presets', () => {
  it('keeps springs damped enough to settle', () => {
    for (const config of Object.values(springs)) {
      const zeta = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));
      expect(zeta).toBeGreaterThan(0.3);
      expect(zeta).toBeLessThanOrEqual(1);
    }
  });

  it('orders durations quick < base < slow', () => {
    expect(durations.quick).toBeLessThan(durations.base);
    expect(durations.base).toBeLessThan(durations.slow);
  });

  it('jumps to the end when motion is reduced', () => {
    expect(spring('smooth', true).reduceMotion).toBe(ReduceMotion.Always);
    expect(timing('base', true).reduceMotion).toBe(ReduceMotion.Always);
  });

  it('owns the reduce-motion decision instead of deferring to the system', () => {
    expect(spring('bouncy').reduceMotion).toBe(ReduceMotion.Never);
    expect(timing('quick').reduceMotion).toBe(ReduceMotion.Never);
  });

  it('passes initial velocity through', () => {
    expect(spring('snappy', false, 120).velocity).toBe(120);
    expect(spring('snappy')).not.toHaveProperty('velocity');
  });
});
