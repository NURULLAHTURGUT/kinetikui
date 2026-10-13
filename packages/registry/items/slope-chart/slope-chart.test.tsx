import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { SlopeChart } from './slope-chart';

const SERIES = [
  { label: 'Lisbon', from: 24, to: 31 },
  { label: 'Kyoto', from: 30, to: 22 },
  { label: 'Oslo', from: 12, to: 18 },
];

async function layout() {
  await act(async () => {
    fireEvent(screen.getByRole('image'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 240 } },
    });
  });
}

describe('SlopeChart', () => {
  it('describes every series for screen readers', async () => {
    await render(
      <SlopeChart
        accessibilityLabel="Share of trips"
        fromLabel="2025"
        toLabel="2026"
        series={SERIES}
        formatValue={(v) => `${v}%`}
      />,
    );
    expect(
      screen.getByRole('image', {
        name: 'Share of trips. 2025 to 2026. Lisbon: 24% to 31%; Kyoto: 30% to 22%; Oslo: 12% to 18%',
      }),
    ).toBeOnTheScreen();
  });

  it('labels both ends with value and change once laid out', async () => {
    await render(<SlopeChart accessibilityLabel="Trips" series={SERIES} />);
    await layout();
    expect(screen.getByText('Lisbon  24', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('31  +7', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('22  −8', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
