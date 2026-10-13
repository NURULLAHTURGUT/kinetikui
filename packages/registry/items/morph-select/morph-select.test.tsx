import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { MorphSelect } from './morph-select';

const OPTIONS = [
  { value: 'lis', label: 'Lisbon', description: 'UTC+0' },
  { value: 'ber', label: 'Berlin', description: 'UTC+1' },
  { value: 'ist', label: 'Istanbul', description: 'UTC+3' },
  { value: 'tok', label: 'Tokyo', description: 'UTC+9', disabled: true },
];

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <MorphSelect
      label="Office"
      options={OPTIONS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('MorphSelect', () => {
  it('names the trigger with the label and the placeholder', async () => {
    await render(<Harness />);
    expect(screen.getByRole('button', { name: 'Office, Choose' })).toBeOnTheScreen();
  });

  it('opens a list and chooses an option', async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Office, Choose' }));
    expect(screen.getAllByRole('button', { name: 'Office, Choose' })[0]).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ expanded: true }),
    );
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Istanbul, UTC+3' }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onChange).toHaveBeenCalledWith('ist');
    expect(screen.getByRole('button', { name: 'Office, Istanbul' })).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('ignores disabled options', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Office, Choose' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Tokyo, UTC+9' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
