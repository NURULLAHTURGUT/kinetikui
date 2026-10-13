import { act, render, screen } from '@testing-library/react-native';

import { Countdown, splitTime } from './countdown';

describe('splitTime', () => {
  it('splits milliseconds into whole units, rounding seconds up', () => {
    expect(splitTime(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
    expect(splitTime(1500)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 2 });
    expect(splitTime(-10)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('Countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 13, 12, 0, 0));
  });
  afterEach(() => jest.useRealTimers());

  it('reads the time left as a timer and hides days under a day', async () => {
    await render(<Countdown to={new Date(2026, 9, 13, 14, 30, 0)} />);
    expect(screen.getByRole('timer', { name: 'Starts in 2 hours, 30 minutes' })).toBeOnTheScreen();
    expect(screen.queryByText('DAYS')).toBeNull();
    expect(screen.getByText('MINUTES')).toBeOnTheScreen();
  });

  it('ticks down and goes live at zero', async () => {
    const onComplete = jest.fn();
    await render(<Countdown to={Date.now() + 3000} onComplete={onComplete} />);
    expect(screen.getByRole('timer', { name: 'Starts in 3 seconds' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });
    expect(screen.getByRole('timer', { name: 'Starts in 2 seconds' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('timer', { name: 'Live now' })).toBeOnTheScreen();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
