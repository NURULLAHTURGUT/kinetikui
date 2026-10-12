import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { Deckfall, type DeckfallHandle } from './deckfall';

/** Lets the fly-out spring finish so the deck advances. */
const settle = () => act(async () => new Promise((r) => setTimeout(r, 1500)));

const data = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

function setup(props: Partial<Parameters<typeof Deckfall<string>>[0]> = {}) {
  return render(
    <Deckfall
      data={data}
      keyExtractor={(s) => s}
      renderCard={(s) => <Text>{s}</Text>}
      leftLabel="Skip"
      rightLabel="Save"
      {...props}
    />,
  );
}

describe('Deckfall', () => {
  it('exposes only the top card to screen readers', async () => {
    await setup();
    expect(screen.getByText('Alpha')).toBeOnTheScreen();
    expect(screen.queryByText('Bravo')).toBeNull();
    expect(screen.getByText('Bravo', { includeHiddenElements: true })).toBeTruthy();
  });

  it('mounts only the visible cards plus one', async () => {
    await setup({ visible: 2 });
    expect(screen.queryByText('Delta', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Charlie', { includeHiddenElements: true })).toBeTruthy();
  });

  it('swipes from the imperative handle and reports the direction', async () => {
    const ref = createRef<DeckfallHandle>();
    const onSwipe = jest.fn();
    await setup({ ref, onSwipe });
    await act(async () => ref.current?.swipe('right'));
    await settle();
    expect(onSwipe).toHaveBeenCalledWith('Alpha', 'right', 0);
    expect(screen.getByText('Bravo')).toBeOnTheScreen();
  });

  it('offers named swipe actions to screen readers', async () => {
    const onSwipe = jest.fn();
    await setup({ onSwipe });
    const top = screen.getByHintText('Swipe left or right, or use the actions menu');
    expect(top.props.accessibilityActions).toEqual([
      { name: 'swipeLeft', label: 'Skip' },
      { name: 'swipeRight', label: 'Save' },
    ]);
    await act(async () => {
      fireEvent(top, 'accessibilityAction', { nativeEvent: { actionName: 'swipeLeft' } });
    });
    await settle();
    expect(onSwipe).toHaveBeenCalledWith('Alpha', 'left', 0);
  });

  it('calls onEmpty and renders the empty state after the last card', async () => {
    const ref = createRef<DeckfallHandle>();
    const onEmpty = jest.fn();
    await setup({
      ref,
      onEmpty,
      data: ['Only'],
      renderEmpty: () => <Text>All done</Text>,
    });
    await act(async () => ref.current?.swipe('left'));
    await settle();
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(screen.getByText('All done')).toBeOnTheScreen();
  });
});
