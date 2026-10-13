import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { FilterChips } from './filter-chips';

const OPTIONS = [
  { value: 'photos', label: 'Photos', count: 48 },
  { value: 'videos', label: 'Videos', count: 6 },
  { value: 'docs', label: 'Documents' },
];

function Harness({ multiple = true, onChange }: { multiple?: boolean; onChange?: jest.Mock }) {
  const [value, setValue] = useState<string[]>(['photos']);
  return (
    <FilterChips
      accessibilityLabel="Filter by type"
      options={OPTIONS}
      value={value}
      multiple={multiple}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('FilterChips', () => {
  it('renders checkboxes named by label and count', async () => {
    await render(<Harness />);
    expect(screen.getByRole('checkbox', { name: 'Photos, 48' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Documents' })).not.toBeChecked();
  });

  it('adds and removes values when several may be picked', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Videos, 6' }));
    expect(onChange).toHaveBeenLastCalledWith(['photos', 'videos']);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Photos, 48' }));
    expect(onChange).toHaveBeenLastCalledWith(['videos']);
  });

  it('keeps exactly one value in single mode, as radios', async () => {
    const onChange = jest.fn();
    await render(<Harness multiple={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Documents' }));
    expect(onChange).toHaveBeenLastCalledWith(['docs']);
    expect(screen.getByRole('radio', { name: 'Documents' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Photos, 48' })).not.toBeSelected();
  });
});
