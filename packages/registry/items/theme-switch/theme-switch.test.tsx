import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ThemeSwitch, type ThemeMode } from './theme-switch';

function Harness({ label, onChange }: { label?: string; onChange?: jest.Mock }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  return (
    <ThemeSwitch
      label={label}
      value={mode}
      onValueChange={(m) => {
        setMode(m);
        onChange?.(m);
      }}
    />
  );
}

describe('ThemeSwitch', () => {
  it('is a switch named "Dark mode" that is off in light mode', async () => {
    await render(<Harness />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).not.toBeChecked();
  });

  it('flips between light and dark', async () => {
    const onChange = jest.fn();
    await render(<Harness label="Appearance" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Appearance' }));
    expect(onChange).toHaveBeenLastCalledWith('dark');
    expect(screen.getByRole('switch', { name: 'Appearance' })).toBeChecked();
    expect(screen.getByText('On')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Appearance' }));
    expect(onChange).toHaveBeenLastCalledWith('light');
  });
});
