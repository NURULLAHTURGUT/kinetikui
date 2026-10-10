import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { activate } from '../../jest/helpers';
import { MagnetButton } from './magnet-button';

describe('MagnetButton', () => {
  it('renders a labelled button', async () => {
    await render(<MagnetButton>Get started</MagnetButton>);
    expect(screen.getByRole('button', { name: 'Get started' })).toBeOnTheScreen();
  });

  it('presses from the screen-reader activate action', async () => {
    const onPress = jest.fn();
    await render(<MagnetButton onPress={onPress}>Get started</MagnetButton>);
    await activate(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('handles field touches without throwing', async () => {
    await render(<MagnetButton>Get started</MagnetButton>);
    await act(async () => {
      fireEvent(screen.getByRole('button'), 'layout', {
        nativeEvent: { layout: { x: 40, y: 40, width: 160, height: 52 } },
      });
    });
    expect(() =>
      fireGestureHandler(getByGestureTestId('magnet-button'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]),
    ).not.toThrow();
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <MagnetButton onPress={onPress} disabled>
        Get started
      </MagnetButton>,
    );
    await activate(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
