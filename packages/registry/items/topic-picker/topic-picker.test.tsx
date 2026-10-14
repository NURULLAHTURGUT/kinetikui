import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { TopicPicker } from './topic-picker';

const TOPICS = [
  { id: 'a', label: 'Basketball', emoji: '🏀' },
  { id: 'b', label: 'Fruits', emoji: '🍋' },
  { id: 'c', label: 'Weather' },
];

function Harness({ onSubmit }: { onSubmit?: (s: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <TopicPicker
      topics={TOPICS}
      selected={selected}
      onChange={setSelected}
      minimum={2}
      submit={{ label: 'Submit', onPress: onSubmit ?? jest.fn() }}
    />
  );
}

describe('TopicPicker', () => {
  it('toggles topics as checkboxes', async () => {
    await render(<Harness />);
    const chip = screen.getByRole('checkbox', { name: 'Fruits' });
    expect(chip).not.toBeChecked();
    await act(async () => {
      fireEvent.press(chip);
    });
    expect(screen.getByRole('checkbox', { name: 'Fruits' })).toBeChecked();
    await act(async () => {
      fireEvent.press(screen.getByRole('checkbox', { name: 'Fruits' }));
    });
    expect(screen.getByRole('checkbox', { name: 'Fruits' })).not.toBeChecked();
  });

  it('hides the looping copies from screen readers', async () => {
    await render(<Harness />);
    expect(screen.getAllByRole('checkbox', { name: 'Basketball' })).toHaveLength(1);
  });

  it('enables submit once enough are picked', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'SUBMIT' })).toBeDisabled();
    for (const name of ['Basketball', 'Weather']) {
      await act(async () => {
        fireEvent.press(screen.getByRole('checkbox', { name }));
      });
    }
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'SUBMIT' }));
    });
    expect(onSubmit).toHaveBeenCalledWith(['a', 'c']);
  });
});
