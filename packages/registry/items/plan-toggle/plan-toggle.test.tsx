import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PlanPrice, PlanToggle } from './plan-toggle';

const OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly', badge: 'Save 20%' },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [period, setPeriod] = useState('monthly');
  return (
    <>
      <PlanToggle
        accessibilityLabel="Billing period"
        options={OPTIONS}
        value={period}
        onValueChange={(v) => {
          setPeriod(v);
          onChange?.(v);
        }}
      />
      <PlanPrice amount={period === 'yearly' ? 10 : 12} suffix="/ month" />
    </>
  );
}

describe('PlanToggle', () => {
  it('is a radio group with the badge in the option name', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Billing period')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Yearly, Save 20%' })).not.toBeChecked();
  });

  it('switches period and the price follows', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    expect(screen.getByLabelText('$12 / month')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Yearly, Save 20%' }));
    expect(onChange).toHaveBeenCalledWith('yearly');
    expect(screen.getByRole('radio', { name: 'Yearly, Save 20%' })).toBeChecked();
    expect(screen.getByLabelText('$10 / month')).toBeOnTheScreen();
  });

  it('ignores a press on the current option', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Monthly' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
