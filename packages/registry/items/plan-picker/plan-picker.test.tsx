import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PlanPicker } from './plan-picker';

const PLANS = [
  {
    id: 'yearly',
    title: 'Yearly',
    note: '14-day free trial',
    monthly: '7.49$',
    billed: '89.98/yr',
  },
  { id: 'monthly', title: 'Monthly', note: '7-day free trial', monthly: '9.98$' },
];

function Harness({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState('yearly');
  return (
    <PlanPicker
      plans={PLANS}
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
    />
  );
}

describe('PlanPicker', () => {
  it('reads each plan as a radio with its price', async () => {
    await render(<Harness />);
    expect(
      screen.getByRole('radio', { name: 'Yearly, 14-day free trial, 7.49$ per month, 89.98/yr' }),
    ).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Monthly, 7-day free trial, 9.98$ per month' }),
    ).not.toBeChecked();
  });

  it('switches plans and ignores the current one', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: /Yearly/ }));
    });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: /Monthly/ }));
    });
    expect(onChange).toHaveBeenCalledWith('monthly');
    expect(screen.getByRole('radio', { name: /Monthly/ })).toBeChecked();
  });

  it('shows the footnote and runs the button', async () => {
    const onPress = jest.fn();
    await render(
      <PlanPicker
        plans={PLANS}
        value="yearly"
        onChange={jest.fn()}
        footnote="Money back"
        cta={{ label: 'Start free trial', onPress }}
      />,
    );
    expect(screen.getByText('Money back')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Start free trial' }));
    });
    expect(onPress).toHaveBeenCalled();
  });
});
