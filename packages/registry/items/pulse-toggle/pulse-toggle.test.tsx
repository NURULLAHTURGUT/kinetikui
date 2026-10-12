import { render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { activate, tapGesture } from '../../jest/helpers';
import { PulseToggle } from './pulse-toggle';

function Harness({
  initial = false,
  onChange,
}: {
  initial?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <PulseToggle
      label="Release alerts"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('PulseToggle', () => {
  it('exposes a switch named by its label', async () => {
    await render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Release alerts' });
    expect(sw).not.toBeChecked();
    expect(screen.getByText('Release alerts')).toBeOnTheScreen();
  });

  it('toggles on tap', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await tapGesture('pulse-toggle');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('toggles from the screen-reader activate action', async () => {
    const onChange = jest.fn();
    await render(<Harness initial onChange={onChange} />);
    await activate(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does nothing while disabled', async () => {
    const onValueChange = jest.fn();
    await render(
      <PulseToggle
        accessibilityLabel="Alerts"
        value={false}
        onValueChange={onValueChange}
        disabled
      />,
    );
    await activate(screen.getByRole('switch'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
