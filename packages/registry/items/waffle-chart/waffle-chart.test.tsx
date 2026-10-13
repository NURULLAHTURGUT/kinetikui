import { fireEvent, render, screen } from '@testing-library/react-native';

import { WaffleChart, waffleCells } from './waffle-chart';

describe('waffleCells', () => {
  it('rounds shares to whole cells that add up to the total', () => {
    expect(waffleCells([33.3, 33.3, 33.4])).toEqual([33, 33, 34]);
    expect(waffleCells([12.5, 12.5])).toEqual([13, 12]);
  });

  it('never goes past a hundred cells', () => {
    const cells = waffleCells([70, 50]);
    expect(cells.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('WaffleChart', () => {
  const DATA = [
    { label: 'Stays', value: 46 },
    { label: 'Flights', value: 31 },
    { label: 'Food', value: 15 },
  ];

  it('describes the shares for screen readers', async () => {
    await render(<WaffleChart accessibilityLabel="Trip budget" data={DATA} />);
    expect(
      screen.getByRole('image', { name: 'Trip budget: Stays 46%, Flights 31%, Food 15%' }),
    ).toBeOnTheScreen();
  });

  it('focuses one slice from the legend and clears it again', async () => {
    await render(<WaffleChart accessibilityLabel="Trip budget" data={DATA} />);
    const flights = screen.getByRole('button', { name: 'Flights, 31%' });
    await fireEvent.press(flights);
    expect(screen.getByRole('button', { name: 'Flights, 31%' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Flights, 31%' }));
    expect(screen.getByRole('button', { name: 'Flights, 31%' })).not.toBeSelected();
  });
});
