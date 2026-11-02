import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { PulseRange, beatDuration, rangePosition } from './pulse-range';

const card = (
  <KinetikProvider reduceMotion="always">
    <PulseRange bpm={112} min={52} max={168} average={74} ago="JUST NOW" />
  </KinetikProvider>
);

describe('PulseRange', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(
      screen.getByLabelText(
        'Heart rate 112 beats per minute. TODAY average 74, low 52, high 168. JUST NOW.',
      ),
    ).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('pulse-range-track', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(
      screen.getByLabelText(
        'Heart rate 112 beats per minute. TODAY average 74, low 52, high 168. JUST NOW.',
      ),
    ).toBeOnTheScreen();
  });
});

describe('range helpers', () => {
  it('places a reading in the range', () => {
    expect(rangePosition(100, 50, 150)).toBe(0.5);
    expect(rangePosition(10, 50, 150)).toBe(0);
    expect(rangePosition(60, 60, 60)).toBe(0.5);
  });
  it('keeps the beat in a sane range', () => {
    expect(beatDuration(60)).toBe(1000);
    expect(beatDuration(1000)).toBe(300);
    expect(beatDuration(1)).toBe(2000);
  });
});
