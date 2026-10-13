import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { KinetikProvider } from '../../shared/tokens/theme';
import { SplitButton } from './split-button';

const OPTIONS = [
  { value: 'merge', label: 'Merge', description: 'Keep every commit' },
  { value: 'squash', label: 'Squash and merge', description: 'One commit on main' },
  { value: 'rebase', label: 'Rebase and merge' },
];

function Harness({ onPress, onChange }: { onPress?: jest.Mock; onChange?: jest.Mock }) {
  const [value, setValue] = useState('merge');
  return (
    // Reduced motion closes the menu at once.
    <KinetikProvider reduceMotion="always">
      <SplitButton
        options={OPTIONS}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
        onPress={onPress ?? jest.fn()}
      />
    </KinetikProvider>
  );
}

describe('SplitButton', () => {
  it('runs the chosen option from the main half', async () => {
    const onPress = jest.fn();
    await render(<Harness onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Merge' }));
    expect(onPress).toHaveBeenCalledWith('merge');
  });

  it('picks another option from the menu, which becomes the action', async () => {
    const onPress = jest.fn();
    const onChange = jest.fn();
    await render(<Harness onPress={onPress} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('menuitem', { name: 'Merge, Keep every commit' })).toBeSelected();
    await fireEvent.press(
      screen.getByRole('menuitem', { name: 'Squash and merge, One commit on main' }),
    );
    expect(onChange).toHaveBeenCalledWith('squash');
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Squash and merge' }));
    expect(onPress).toHaveBeenCalledWith('squash');
  });

  it('closes the menu without changing anything from the backdrop', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close menu' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: /^Rebase/ })).toBeNull();
  });
});
