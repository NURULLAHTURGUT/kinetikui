import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ExpandToolbar } from './expand-toolbar';

const ITEMS = [
  { key: 'pen', label: 'Pen', icon: () => <View /> },
  { key: 'text', label: 'Text', icon: () => <View /> },
  { key: 'photo', label: 'Photo', icon: () => <View /> },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState('pen');
  return (
    <ExpandToolbar
      accessibilityLabel="Note tools"
      items={ITEMS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('ExpandToolbar', () => {
  it('is a toolbar of buttons with the picked one selected', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Note tools')).toHaveProp('accessibilityRole', 'toolbar');
    expect(screen.getByRole('button', { name: 'Pen' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Photo' })).not.toBeSelected();
  });

  it('picks a tool on press and ignores the current one', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pen' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Photo' }));
    expect(onChange).toHaveBeenCalledWith('photo');
    expect(screen.getByRole('button', { name: 'Photo' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Pen' })).not.toBeSelected();
  });
});
