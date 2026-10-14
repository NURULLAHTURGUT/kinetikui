import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ExpenseCard, niceMax } from './expense-card';

const ROWS = [
  { label: 'Housing', value: 6200 },
  { label: 'Utilities', value: 1400 },
  { label: 'Food', value: 0 },
];

describe('niceMax', () => {
  it('rounds up to a tidy number', () => {
    expect(niceMax(6200)).toBe(10000);
    expect(niceMax(1800)).toBe(2000);
    expect(niceMax(2100)).toBe(2500);
    expect(niceMax(0)).toBe(10);
  });
});

describe('ExpenseCard', () => {
  it('summarises the rows and draws the scale', async () => {
    await render(<ExpenseCard rows={ROWS} />);
    expect(screen.getByLabelText('Housing 6.2K, Utilities 1.4K, Food 0')).toBeOnTheScreen();
    for (const tick of ['0', '2K', '4K', '6K', '8K', '10K']) {
      expect(screen.getByText(tick, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });

  it('changes period from the menu', async () => {
    const onPeriodChange = jest.fn();
    await render(
      <ExpenseCard
        rows={ROWS}
        periods={['Weekly', 'Monthly']}
        period="Weekly"
        onPeriodChange={onPeriodChange}
      />,
    );
    const button = screen.getByRole('button', { name: 'Period: Weekly' });
    expect(button).toBeCollapsed();
    await act(async () => {
      fireEvent.press(button);
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('menuitem', { name: 'Monthly' }));
    });
    expect(onPeriodChange).toHaveBeenCalledWith('Monthly');
    expect(screen.queryByRole('menuitem')).toBeNull();
  });
});
