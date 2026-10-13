import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { isLight, SwatchPicker } from './swatch-picker';

const SWATCHES = [
  { value: '#1F5FE0', label: 'Blue' },
  { value: '#F2C94C', label: 'Butter' },
  { value: '#2F2F2F', label: 'Graphite' },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState('#1F5FE0');
  return (
    <SwatchPicker
      accessibilityLabel="Accent colour"
      swatches={SWATCHES}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('isLight', () => {
  it('tells light colours from dark ones', () => {
    expect(isLight('#F2C94C')).toBe(true);
    expect(isLight('#FFFFFF')).toBe(true);
    expect(isLight('#2F2F2F')).toBe(false);
    expect(isLight('#1F5FE0')).toBe(false);
    expect(isLight('tomato')).toBe(false);
  });
});

describe('SwatchPicker', () => {
  it('is a radio group of named colours', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Accent colour')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Blue' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Butter' })).not.toBeChecked();
  });

  it('chooses a colour on press, once', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Graphite' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Graphite' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#2F2F2F');
    expect(screen.getByRole('radio', { name: 'Graphite' })).toBeChecked();
  });
});
