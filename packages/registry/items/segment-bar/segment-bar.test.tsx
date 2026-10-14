import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { SegmentBar } from './segment-bar';

type Format = 'png' | 'jpg' | 'heic';

const OPTIONS: { value: Format; label: string }[] = [
  { value: 'png', label: 'png' },
  { value: 'jpg', label: 'jpg' },
  { value: 'heic', label: 'heic' },
];

function Harness({ onChange }: { onChange?: (v: Format) => void }) {
  const [value, setValue] = useState<Format>('png');
  return (
    <SegmentBar
      label="File format"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('SegmentBar', () => {
  it('names the group and checks the selection', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('File format')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'png' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'jpg' })).not.toBeChecked();
  });

  it('changes the selection and ignores a press on the current option', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'png' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('radio', { name: 'heic' }));
    expect(onChange).toHaveBeenCalledWith('heic');
    expect(screen.getByRole('radio', { name: 'heic' })).toBeChecked();
  });

  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(
      <SegmentBar
        label="Format"
        options={OPTIONS}
        value="png"
        onChange={jest.fn()}
        action={{ icon: null, label: 'Save image', onPress }}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save image' }));
    expect(onPress).toHaveBeenCalled();
  });
});
