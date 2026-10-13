import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { density, quantile, Ridgeline } from './ridgeline';

const GROUPS = [
  { key: 'lis', label: 'Lisbon', values: [18, 22, 25, 27, 30, 31, 35, 40] },
  { key: 'ber', label: 'Berlin', values: [20, 24, 26, 28, 29, 33, 36, 38, 45] },
];

describe('quantile and density', () => {
  it('interpolates quantiles', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10], 0.25)).toBe(10);
  });

  it('peaks near the bulk of the samples', () => {
    const d = density([50, 50, 51, 49], 0, 100);
    const top = d.indexOf(Math.max(...d));
    expect(top).toBeGreaterThan(28);
    expect(top).toBeLessThan(36);
  });
});

describe('Ridgeline', () => {
  it('names each row with its median and middle half', async () => {
    await render(<Ridgeline accessibilityLabel="Commutes" groups={GROUPS} />);
    expect(
      screen.getByRole('button', { name: 'Lisbon, median 29, middle half 24 to 32' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('18')).toBeOnTheScreen();
    expect(screen.getByText('45')).toBeOnTheScreen();
  });

  it('lifts a ridge and reads it out', async () => {
    await render(<Ridgeline accessibilityLabel="Commutes" groups={GROUPS} />);
    await act(async () => {
      fireEvent(screen.getByLabelText('Commutes'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 200 } },
      });
    });
    await fireEvent.press(screen.getByRole('button', { name: /^Berlin/ }));
    expect(screen.getByRole('button', { name: /^Berlin/ })).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByText('Berlin: median 29 · middle half 26–36')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Berlin/ }));
    expect(screen.getByText('Tap a row to compare it')).toBeOnTheScreen();
  });
});
