import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { TimerFrame, clockLabel, framePath } from './timer-frame';

const card = (
  <KinetikProvider reduceMotion="always">
    <TimerFrame total={300} start={217} label="BREW" />
  </KinetikProvider>
);

describe('TimerFrame', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('3:37 left')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(screen.getByTestId('timer-frame', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { width: 280, height: 100 } },
    });
    expect(screen.getByLabelText('3:37 left')).toBeOnTheScreen();
  });
});

describe('clockLabel', () => {
  it('writes minutes and seconds', () => {
    expect(clockLabel(217)).toBe('3:37');
    expect(clockLabel(60)).toBe('1:00');
    expect(clockLabel(-1)).toBe('0:00');
  });
});

describe('framePath', () => {
  it('starts and ends at the middle of the top edge', () => {
    const d = framePath(200, 100, 4, 20);
    expect(d.startsWith('M100 4')).toBe(true);
    expect(d.endsWith('H100')).toBe(true);
  });
});

describe('counting down', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts, stops at zero and calls back once', async () => {
    const onDone = jest.fn();
    await render(
      <KinetikProvider reduceMotion="always">
        <TimerFrame total={60} start={2} onDone={onDone} />
      </KinetikProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText('0:00 left, paused')).toBeOnTheScreen();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('holds when not running', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <TimerFrame total={60} running={false} />
      </KinetikProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByLabelText('1:00 left, paused')).toBeOnTheScreen();
  });
});
