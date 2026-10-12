import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { DockBar, type DockItem } from './dock-bar';

const items: DockItem[] = [
  { key: 'home', label: 'Home', icon: () => <Text>H</Text> },
  { key: 'search', label: 'Search', icon: () => <Text>S</Text> },
  { key: 'profile', label: 'Profile', icon: () => <Text>P</Text> },
];

function Harness({ onChange }: { onChange?: (k: string) => void }) {
  const [value, setValue] = useState('home');
  return (
    <DockBar
      accessibilityLabel="Main"
      items={items}
      value={value}
      onChange={(k) => {
        setValue(k);
        onChange?.(k);
      }}
    />
  );
}

describe('DockBar', () => {
  it('exposes tabs with the active one selected', async () => {
    await render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Profile' })).not.toBeSelected();
  });

  it('chooses the item under the finger on release', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    // Item 2 (Profile) sits at pad 8 + 2 * (48 + 6) = 116..164.
    await act(async () => {
      fireGestureHandler(getByGestureTestId('dock-bar'), [
        { state: State.BEGAN, x: 20 },
        { state: State.ACTIVE, x: 80 },
        { state: State.ACTIVE, x: 140 },
        { state: State.END, x: 140 },
      ]);
    });
    await flush();
    expect(onChange).toHaveBeenCalledWith('profile');
  });

  it('chooses from the screen-reader activate action', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act(async () => {
      fireEvent(screen.getByRole('tab', { name: 'Search' }), 'accessibilityAction', {
        nativeEvent: { actionName: 'activate' },
      });
    });
    expect(onChange).toHaveBeenCalledWith('search');
  });
});
