import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { formatMinor, MoneyField } from './money-field';

const text = (minor: number) =>
  formatMinor(minor)
    .map((g) => g.ch)
    .join('');

function Harness({ max }: { max?: number }) {
  const [value, setValue] = useState(0);
  return <MoneyField label="Amount" value={value} onChangeValue={setValue} max={max} />;
}

describe('formatMinor', () => {
  it('groups the whole part and keeps the fraction', () => {
    expect(text(0)).toBe('0.00');
    expect(text(7)).toBe('0.07');
    expect(text(123456)).toBe('1,234.56');
    expect(text(123456789)).toBe('1,234,567.89');
    expect(
      formatMinor(1234500, 0, '.', ',')
        .map((g) => g.ch)
        .join(''),
    ).toBe('1.234.500');
  });
});

describe('MoneyField', () => {
  it('reads the formatted amount', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Amount')).toHaveProp('accessibilityValue', { text: '$0.00' });
  });

  it('takes digits like a till, from the right', async () => {
    await render(<Harness />);
    const field = screen.getByLabelText('Amount');
    await fireEvent.changeText(field, '1');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '12');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '1250');
    expect(screen.getByLabelText('Amount')).toHaveProp('accessibilityValue', { text: '$12.50' });
    // Backspace drops the last digit.
    await fireEvent.changeText(screen.getByLabelText('Amount'), '125');
    expect(screen.getByLabelText('Amount')).toHaveProp('accessibilityValue', { text: '$1.25' });
  });

  it('ignores anything that is not a digit and stops at the maximum', async () => {
    await render(<Harness max={10000} />);
    await fireEvent.changeText(screen.getByLabelText('Amount'), '9.9x9');
    expect(screen.getByLabelText('Amount')).toHaveProp('accessibilityValue', { text: '$9.99' });
    await fireEvent.changeText(screen.getByLabelText('Amount'), '99999');
    expect(screen.getByLabelText('Amount')).toHaveProp('accessibilityValue', { text: '$9.99' });
  });
});
