import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ChoiceCards } from './choice-cards';

const OPTIONS = [
  { value: 'standard', title: 'Standard', description: '3 to 5 days', detail: 'Free' },
  { value: 'express', title: 'Express', description: 'Next day', detail: '$9', badge: 'Popular' },
  { value: 'drone', title: 'Same day', description: 'Not in your area', disabled: true },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState('standard');
  return (
    <ChoiceCards
      accessibilityLabel="Delivery"
      options={OPTIONS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('ChoiceCards', () => {
  it('is a radio group whose cards read title, badge, detail and description', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Delivery')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Express, Popular, $9, Next day' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Standard, Free, 3 to 5 days' })).toBeChecked();
  });

  it('selects a card on press', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^Express/ }));
    expect(onChange).toHaveBeenCalledWith('express');
    expect(screen.getByRole('radio', { name: /^Express/ })).toBeChecked();
  });

  it('skips disabled cards and repeated presses', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^Same day/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Standard/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: /^Same day/ })).toBeDisabled();
  });
});
