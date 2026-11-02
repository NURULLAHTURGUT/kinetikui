import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { TideWave, isFalling, tideAt } from './tide-wave';

const card = (
  <KinetikProvider reduceMotion="always">
    <TideWave
      tides={[
        { hour: 1, height: 1.2 },
        { hour: 7, height: 6.1 },
        { hour: 13, height: 0.8 },
        { hour: 19, height: 6.6 },
        { hour: 24, height: 2.1 },
      ]}
      now={9}
    />
  </KinetikProvider>
);

describe('TideWave', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('Tide 4.8 feet and falling')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('tide-wave-chart', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('Tide 4.8 feet and falling')).toBeOnTheScreen();
  });
});

describe('tide helpers', () => {
  const tides = [
    { hour: 1, height: 1.2 },
    { hour: 7, height: 6.1 },
    { hour: 13, height: 0.8 },
    { hour: 19, height: 6.6 },
    { hour: 24, height: 2.1 },
  ];
  it('hits the tides exactly and eases between them', () => {
    expect(tideAt(7, tides)).toBeCloseTo(6.1);
    expect(tideAt(4, tides)).toBeCloseTo(3.65);
  });
  it('holds outside the known range', () => {
    expect(tideAt(0, tides)).toBe(1.2);
  });
  it('knows the direction', () => {
    expect(isFalling(10, tides)).toBe(true);
    expect(isFalling(4, tides)).toBe(false);
  });
});
