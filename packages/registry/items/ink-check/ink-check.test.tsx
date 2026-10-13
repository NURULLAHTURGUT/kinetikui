import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { InkCheck } from './ink-check';

function Harness({ onChange }: { onChange?: (v: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <InkCheck
      label="Book the flights"
      description="Before the fares go up"
      checked={checked}
      strike
      onCheckedChange={(v) => {
        setChecked(v);
        onChange?.(v);
      }}
    />
  );
}

describe('InkCheck', () => {
  it('is a checkbox named by its label', async () => {
    await render(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Book the flights' });
    expect(box).not.toBeChecked();
    expect(screen.getByText('Before the fares go up')).toBeOnTheScreen();
  });

  it('checks and unchecks on press', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('checkbox')).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('ignores presses while disabled', async () => {
    const onChange = jest.fn();
    await render(<InkCheck label="Locked" checked={false} onCheckedChange={onChange} disabled />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
