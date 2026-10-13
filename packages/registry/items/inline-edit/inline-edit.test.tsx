import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { InlineEdit } from './inline-edit';

function Harness({ onSubmit }: { onSubmit?: jest.Mock }) {
  const [name, setName] = useState('Spring launch');
  return (
    <InlineEdit
      accessibilityLabel="Project name"
      value={name}
      onSubmit={(v) => {
        setName(v);
        onSubmit?.(v);
      }}
    />
  );
}

describe('InlineEdit', () => {
  it('reads the label and the value as a button', async () => {
    await render(<Harness />);
    expect(screen.getByRole('button', { name: 'Project name, Spring launch' })).toBeOnTheScreen();
  });

  it('turns into a field and saves the trimmed text', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Project name/ }));
    await fireEvent.changeText(screen.getByLabelText('Project name'), '  Autumn launch ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith('Autumn launch');
    expect(screen.getByRole('button', { name: 'Project name, Autumn launch' })).toBeOnTheScreen();
  });

  it('cancels without saving, and drops empty edits', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Project name/ }));
    await fireEvent.changeText(screen.getByLabelText('Project name'), 'Nope');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Project name/ }));
    await fireEvent.changeText(screen.getByLabelText('Project name'), '   ');
    await fireEvent(screen.getByLabelText('Project name'), 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Project name, Spring launch' })).toBeOnTheScreen();
  });
});
