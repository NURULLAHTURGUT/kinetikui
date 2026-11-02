import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ZoneArc, arcFraction, zoneIndex } from './zone-arc';

const card = (
  <KinetikProvider reduceMotion="always">
    <ZoneArc
      value={86}
      min={0}
      zones={[
        { to: 50, color: 'hsl(145, 76%, 44%)' },
        { to: 100, color: 'hsl(50, 90%, 50%)' },
        { to: 150, color: 'hsl(28, 90%, 50%)' },
        { to: 200, color: 'hsl(350, 72%, 44%)' },
      ]}
      unit="AQI"
      ago="4 min ago"
    />
  </KinetikProvider>
);

describe('ZoneArc', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('86 AQI, zone 2 of 4, 4 min ago')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('zone-arc-dial', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('86 AQI, zone 2 of 4, 4 min ago')).toBeOnTheScreen();
  });
});

describe('arc helpers', () => {
  const zones = [
    { to: 50, color: 'hsl(145, 76%, 44%)' },
    { to: 100, color: 'hsl(50, 90%, 50%)' },
    { to: 150, color: 'hsl(28, 90%, 50%)' },
    { to: 200, color: 'hsl(350, 72%, 44%)' },
  ];
  it('finds the fraction of the arc', () => {
    expect(arcFraction(50, 0, 200)).toBe(0.25);
    expect(arcFraction(500, 0, 200)).toBe(1);
  });
  it('finds the zone', () => {
    expect(zoneIndex(10, zones)).toBe(0);
    expect(zoneIndex(100, zones)).toBe(2);
    expect(zoneIndex(999, zones)).toBe(3);
  });
});
