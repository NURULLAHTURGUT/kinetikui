import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { MoonPhases, daysToFull, illumination, moonPath, phaseName } from './moon-phases';

const card = (
  <KinetikProvider reduceMotion="always">
    <MoonPhases phase={0.57} />
  </KinetikProvider>
);

describe('MoonPhases', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(
      screen.getByLabelText('Waning Gibbous, 95% lit. Next full moon in 27 days'),
    ).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('moon-phases-row', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(
      screen.getByLabelText('Waning Gibbous, 95% lit. Next full moon in 27 days'),
    ).toBeOnTheScreen();
  });
});

describe('moon helpers', () => {
  it('names the phases', () => {
    expect(phaseName(0)).toBe('New Moon');
    expect(phaseName(0.5)).toBe('Full Moon');
    expect(phaseName(0.625)).toBe('Waning Gibbous');
  });
  it('knows how much is lit', () => {
    expect(illumination(0)).toBeCloseTo(0);
    expect(illumination(0.5)).toBeCloseTo(1);
    expect(illumination(1.5)).toBeCloseTo(1);
  });
  it('counts days to the next full moon', () => {
    expect(daysToFull(0.5)).toBe(0);
    expect(daysToFull(0)).toBe(15);
  });
  it('lights the right side while waxing and the left while waning', () => {
    expect(moonPath(10, 0.25)).toContain('0 0 1 0 10');
    expect(moonPath(10, 0.75)).toContain('0 0 0 0 10');
  });
});
