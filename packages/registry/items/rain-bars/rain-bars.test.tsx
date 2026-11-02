import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { RainBars, barLengths } from './rain-bars';

const card = (
  <KinetikProvider reduceMotion="always">
    <RainBars
      title="Steady Rain"
      total={19}
      amounts={[3, 5, 8, 6, 9, 12, 16, 11, 7, 10, 14, 18, 15, 9, 6, 8, 12, 17, 13, 8, 5, 7, 4, 3]}
      times={['NOW', '12:30', '13:00', '13:30']}
    />
  </KinetikProvider>
);

describe('RainBars', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('Steady Rain, 19 MM expected')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('rain-bars-chart', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('Steady Rain, 19 MM expected')).toBeOnTheScreen();
  });
});

describe('barLengths', () => {
  it('scales to the wettest period and keeps a floor', () => {
    expect(barLengths([0, 5, 10], 50)).toEqual([6, 25, 50]);
  });
});
