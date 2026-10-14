import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { BookPocket } from './book-pocket';

const BOOKS = [
  { id: 'a', title: 'Night Atlas', author: 'R. Vale' },
  { id: 'b', title: 'The Ember Crown' },
];

describe('BookPocket', () => {
  it('reads the shelf and its count', async () => {
    await render(<BookPocket title="Fantasy" count={8} books={BOOKS} onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Fantasy, 8 books' })).toBeOnTheScreen();
  });

  it('counts the books when no count is given', async () => {
    await render(<BookPocket title="Horror" unit="titles" books={BOOKS} />);
    expect(screen.getByLabelText('Horror, 2 titles')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<BookPocket title="Fantasy" books={BOOKS} onPress={onPress} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Fantasy, 2 books' }));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws covers once laid out', async () => {
    await render(<BookPocket title="Fantasy" books={BOOKS} />);
    await act(async () => {
      fireEvent(screen.getByLabelText('Fantasy, 2 books'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 180, height: 176 } },
      });
    });
    expect(screen.getByText('Night Atlas')).toBeOnTheScreen();
    expect(screen.getByText('R. VALE')).toBeOnTheScreen();
  });
});
