import { fireEvent, render, screen } from '@testing-library/react-native';

import { DonutChart } from './donut-chart';

const data = [
  { label: 'Rent', value: 60 },
  { label: 'Food', value: 30 },
  { label: 'Other', value: 10 },
];

describe('DonutChart', () => {
  it('describes every slice and shows the total', async () => {
    await render(
      <DonutChart accessibilityLabel="Spending" data={data} formatValue={(v) => `$${v}`} />,
    );
    expect(
      screen.getByRole('image', { name: /Spending\. Rent \$60, Food \$30, Other \$10/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText('$100')).toBeOnTheScreen();
  });

  it('selects from the legend and clears on a second press', async () => {
    const onSelect = jest.fn();
    await render(<DonutChart accessibilityLabel="Spending" data={data} onSelect={onSelect} />);
    const food = screen.getByRole('button', { name: 'Food, 30' });
    await fireEvent.press(food);
    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole('button', { name: 'Food, 30' })).toBeSelected();
    expect(screen.getByText('Food · 30%')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Food, 30' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
