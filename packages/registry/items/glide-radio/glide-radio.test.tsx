import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { GlideRadio } from './glide-radio';

const OPTIONS = [
  { value: 'all', label: 'Everything', description: 'Every reply and mention' },
  { value: 'mentions', label: 'Mentions only' },
  { value: 'none', label: 'Nothing' },
  { value: 'digest', label: 'Weekly digest', disabled: true },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState('mentions');
  return (
    <GlideRadio
      accessibilityLabel="Notify me about"
      options={OPTIONS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('GlideRadio', () => {
  it('is a radio group with the current option checked', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Notify me about')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Mentions only' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Everything, Every reply and mention' }),
    ).not.toBeChecked();
  });

  it('moves the choice on press and skips disabled options', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Nothing' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Weekly digest' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Nothing' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('none');
    expect(screen.getByRole('radio', { name: 'Nothing' })).toBeChecked();
  });
});
