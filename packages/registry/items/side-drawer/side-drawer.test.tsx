import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { SideDrawer } from './side-drawer';

const ITEMS = [
  { key: 'inbox', label: 'Inbox', badge: '12' },
  { key: 'sent', label: 'Sent' },
  { key: 'archive', label: 'Archive' },
];

function Harness({ onSelect }: { onSelect?: jest.Mock }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('inbox');
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Open menu</Text>
      </Pressable>
      <SideDrawer
        visible={open}
        onClose={() => setOpen(false)}
        items={ITEMS}
        active={active}
        onSelect={(key) => {
          setActive(key);
          setOpen(false);
          onSelect?.(key);
        }}
        header={<Text>Signed in as Ada</Text>}
      />
    </>
  );
}

describe('SideDrawer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows its header and rows with the current one selected', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByText('Signed in as Ada')).toBeOnTheScreen();
    expect(screen.getByRole('menuitem', { name: 'Inbox, 12' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('reports a chosen row and closes after its exit', async () => {
    const onSelect = jest.fn();
    await render(<Harness onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(onSelect).toHaveBeenCalledWith('archive');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('menuitem', { name: 'Archive' })).toBeNull();
  });

  it('closes on a tap outside', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close menu' }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Signed in as Ada')).toBeNull();
  });

  it('closes when dragged back towards its edge', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));
    await act(async () => {
      fireGestureHandler(getByGestureTestId('side-drawer'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -20, velocityX: -100 },
        { state: State.ACTIVE, translationX: -200, velocityX: -100 },
        { state: State.END, translationX: -200, velocityX: -100 },
      ]);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Signed in as Ada')).toBeNull();
  });
});
