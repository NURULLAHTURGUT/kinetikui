import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { SearchMorph } from './search-morph';

function Harness({ onSubmit }: { onSubmit?: jest.Mock }) {
  const [query, setQuery] = useState('');
  return (
    <SearchMorph
      value={query}
      onChangeText={setQuery}
      onSubmit={onSubmit}
      placeholder="Search places"
    >
      <Text>Recent: Lisbon</Text>
    </SearchMorph>
  );
}

describe('SearchMorph', () => {
  it('starts as a button and opens into a field with its children', async () => {
    await render(<Harness />);
    expect(screen.queryByText('Recent: Lisbon')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Search places' }));
    expect(screen.getByText('Recent: Lisbon')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });

  it('types, clears and submits', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search places' }));
    const field = screen.getByLabelText('Search places', { exact: true });
    await fireEvent.changeText(field, 'Kyoto');
    await fireEvent(field, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('Kyoto');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('closes and clears on Cancel', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search places' }));
    await fireEvent.changeText(screen.getByLabelText('Search places', { exact: true }), 'Oslo');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Recent: Lisbon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Search places' })).toBeOnTheScreen();
  });
});
