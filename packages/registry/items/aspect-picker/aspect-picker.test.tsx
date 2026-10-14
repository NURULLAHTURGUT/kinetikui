import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { AspectPicker } from './aspect-picker';

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('1:1');
  return (
    <AspectPicker
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('AspectPicker', () => {
  it('offers the default ratios as a radio group', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Aspect ratio')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Square' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('picks a ratio', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Portrait 2 by 3' }));
    expect(onChange).toHaveBeenCalledWith('2:3');
    expect(screen.getByRole('radio', { name: 'Portrait 2 by 3' })).toBeChecked();
  });

  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(
      <AspectPicker
        value="1:1"
        onChange={jest.fn()}
        action={{ icon: null, label: 'More ratios', onPress }}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'More ratios' }));
    expect(onPress).toHaveBeenCalled();
  });
});
