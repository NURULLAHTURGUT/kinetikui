import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { TripGlance, routeDrop, splitMinutes } from './trip-glance';

const card = (
  <KinetikProvider reduceMotion="always">
    <TripGlance
      code="KN81"
      destination="OSL"
      minutesLeft={176}
      progress={0.34}
      status="Landing early"
      bags={2}
    />
  </KinetikProvider>
);

describe('TripGlance', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(
      screen.getByLabelText('KN81 to OSL. 2 hours 56 minutes left. Landing early. 2 bags'),
    ).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('trip-glance-route', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(
      screen.getByLabelText('KN81 to OSL. 2 hours 56 minutes left. Landing early. 2 bags'),
    ).toBeOnTheScreen();
  });
});

describe('routeDrop', () => {
  it('stays level, then falls to the end', () => {
    expect(routeDrop(0.2)).toBe(0);
    expect(routeDrop(1)).toBe(1);
    expect(routeDrop(0.7)).toBeGreaterThan(0);
    expect(routeDrop(0.7)).toBeLessThan(1);
  });
});

describe('splitMinutes', () => {
  it('splits a total into hours and minutes', () => {
    expect(splitMinutes(176)).toEqual({ hours: 2, minutes: 56 });
    expect(splitMinutes(-3)).toEqual({ hours: 0, minutes: 0 });
  });
});
