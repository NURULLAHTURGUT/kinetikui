import { fireEvent, render, screen } from '@testing-library/react-native';

import { RadarChart, type RadarSeries } from './radar-chart';

const axes = ['Distance', 'Climb', 'Views'];
const series: RadarSeries[] = [
  { key: 'ridge', label: 'Ridge loop', values: [8, 6, 9] },
  { key: 'lake', label: 'Lake path', values: [5, 2, 7] },
];

describe('RadarChart', () => {
  it('reads every series value by axis', async () => {
    await render(<RadarChart accessibilityLabel="Trails" axes={axes} series={series} />);
    expect(
      screen.getByRole('image', {
        name: 'Trails. Ridge loop: Distance 8, Climb 6, Views 9. Lake path: Distance 5, Climb 2, Views 7',
      }),
    ).toBeOnTheScreen();
  });

  it('shows and hides a series from the legend', async () => {
    await render(<RadarChart accessibilityLabel="Trails" axes={axes} series={series} />);
    const lake = () => screen.getByRole('switch', { name: 'Lake path' });
    expect(lake().props.accessibilityState.checked).toBe(true);
    await fireEvent.press(lake());
    expect(lake().props.accessibilityState.checked).toBe(false);
    await fireEvent.press(lake());
    expect(lake().props.accessibilityState.checked).toBe(true);
  });

  it('morphs to new values without remounting', async () => {
    const { rerender } = await render(
      <RadarChart accessibilityLabel="Trails" axes={axes} series={series} />,
    );
    await rerender(
      <RadarChart
        accessibilityLabel="Trails"
        axes={axes}
        series={[{ ...series[0]!, values: [4, 4, 4] }, series[1]!]}
      />,
    );
    expect(
      screen.getByRole('image', { name: /Ridge loop: Distance 4, Climb 4, Views 4/ }),
    ).toBeOnTheScreen();
  });
});
