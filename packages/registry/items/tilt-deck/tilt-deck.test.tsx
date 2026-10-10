import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { activate, tapGesture } from '../../jest/helpers';
import { TiltDeck, TiltLayer } from './tilt-deck';

describe('TiltDeck', () => {
  it('renders children and layers', async () => {
    await render(
      <TiltDeck>
        <Text>Artwork</Text>
        <TiltLayer depth={0.5}>
          <Text>Title</Text>
        </TiltLayer>
      </TiltDeck>,
    );
    expect(screen.getByText('Artwork')).toBeOnTheScreen();
    expect(screen.getByText('Title')).toBeOnTheScreen();
  });

  it('is only a button when it has onPress', async () => {
    const { rerender } = await render(
      <TiltDeck accessibilityLabel="Album">
        <Text>Art</Text>
      </TiltDeck>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    await rerender(
      <TiltDeck accessibilityLabel="Album" onPress={() => {}}>
        <Text>Art</Text>
      </TiltDeck>,
    );
    expect(screen.getByRole('button', { name: 'Album' })).toBeOnTheScreen();
  });

  it('calls onPress on tap and from the activate action', async () => {
    const onPress = jest.fn();
    await render(
      <TiltDeck accessibilityLabel="Album" onPress={onPress}>
        <Text>Art</Text>
      </TiltDeck>,
    );
    await tapGesture('tilt-deck-tap');
    await activate(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('tracks touches without throwing', async () => {
    await render(
      <TiltDeck>
        <Text>Art</Text>
      </TiltDeck>,
    );
    expect(() =>
      fireGestureHandler(getByGestureTestId('tilt-deck'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]),
    ).not.toThrow();
  });

  it('renders a layer outside a deck as a plain view', async () => {
    await render(
      <TiltLayer>
        <Text>Loose</Text>
      </TiltLayer>,
    );
    expect(screen.getByText('Loose')).toBeOnTheScreen();
  });
});
