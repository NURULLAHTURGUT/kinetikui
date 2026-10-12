import { act, renderHook } from '@testing-library/react-native';

import { useCountUp } from './use-count-up';

describe('useCountUp', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts from zero to the target and stops there', async () => {
    const { result } = await renderHook(() => useCountUp(100, { duration: 500 }));
    expect(result.current).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    // Ease-out: well past halfway at half time.
    expect(result.current).toBeGreaterThan(80);
    expect(result.current).toBeLessThan(100);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe(100);
  });

  it('counts on from where it is when the target changes', async () => {
    const { result, rerender } = await renderHook(
      ({ to }: { to: number }) => useCountUp(to, { duration: 400 }),
      { initialProps: { to: 50 } },
    );
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(50);
    await rerender({ to: 20 });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBeLessThan(50);
    expect(result.current).toBeGreaterThan(20);
  });

  it('jumps when instant', async () => {
    const { result } = await renderHook(() => useCountUp(42, { instant: true }));
    expect(result.current).toBe(42);
  });
});
