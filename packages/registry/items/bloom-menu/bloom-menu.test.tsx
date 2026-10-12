import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BloomMenu, type BloomAction } from './bloom-menu';

const make = (onPress = jest.fn()): BloomAction[] => [
  { key: 'photo', label: 'Photo', icon: <Text>P</Text>, onPress },
  { key: 'note', label: 'Note', icon: <Text>N</Text>, onPress: jest.fn() },
  { key: 'voice', label: 'Voice memo', icon: <Text>V</Text>, onPress: jest.fn() },
];

describe('BloomMenu', () => {
  it('keeps its actions hidden until it opens', async () => {
    await render(<BloomMenu actions={make()} />);
    const fab = screen.getByRole('button', { name: 'Create' });
    expect(fab.props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByRole('button', { name: 'Photo' })).toBeNull();

    await fireEvent.press(fab);
    expect(screen.getByRole('button', { name: 'Create' }).props.accessibilityState.expanded).toBe(
      true,
    );
    for (const name of ['Photo', 'Note', 'Voice memo']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
  });

  it('runs an action and closes', async () => {
    const onPress = jest.fn();
    const onOpenChange = jest.fn();
    await render(<BloomMenu actions={make(onPress)} onOpenChange={onOpenChange} defaultOpen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Photo' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('button', { name: 'Photo' })).toBeNull();
  });

  it('closes on the escape gesture', async () => {
    await render(<BloomMenu actions={make()} layout="arc" defaultOpen />);
    await fireEvent(screen.getByRole('button', { name: 'Create' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'escape' },
    });
    expect(screen.queryByRole('button', { name: 'Note' })).toBeNull();
  });
});
