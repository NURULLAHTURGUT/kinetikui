import { fireEvent, render, screen } from '@testing-library/react-native';

import { FanStack, type FanItem } from './fan-stack';

const items: FanItem[] = [
  { key: 'a', image: { uri: 'a.jpg' }, title: 'Dunes' },
  { key: 'b', image: { uri: 'b.jpg' }, title: 'Palm' },
  { key: 'c', image: { uri: 'c.jpg' }, title: 'Tide' },
];

describe('FanStack', () => {
  it('is one control while gathered', async () => {
    await render(<FanStack items={items} accessibilityLabel="Beach trip" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Beach trip, 3 items' })).toBeOnTheScreen();
  });

  it('fans out, lifts a card, and gathers on a second tap', async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    await render(<FanStack items={items} onSelect={onSelect} onOpenChange={onOpenChange} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Photos, 3 items' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getAllByRole('button')).toHaveLength(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Palm' }));
    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole('button', { name: 'Palm' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Palm' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
