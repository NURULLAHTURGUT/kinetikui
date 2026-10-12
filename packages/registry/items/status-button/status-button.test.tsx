import { render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { activate, flush, tapGesture } from '../../jest/helpers';
import { StatusButton } from './status-button';

describe('StatusButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('presses while idle', async () => {
    const onPress = jest.fn();
    await render(
      <StatusButton status="idle" onPress={onPress}>
        Pay
      </StatusButton>,
    );
    await tapGesture('status-button');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pay' })).toBeOnTheScreen();
  });

  it('is busy and ignores presses while loading', async () => {
    const onPress = jest.fn();
    await render(
      <StatusButton status="loading" onPress={onPress}>
        Pay
      </StatusButton>,
    );
    const button = screen.getByRole('button', { name: 'Pay, in progress' });
    expect(button).toBeBusy();
    await activate(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('names the outcome and plays its haptic', async () => {
    const { rerender } = await render(<StatusButton status="loading">Pay</StatusButton>);
    await rerender(
      <StatusButton status="success" successLabel="Paid">
        Pay
      </StatusButton>,
    );
    await flush();
    expect(screen.getByRole('button', { name: 'Paid' })).toBeOnTheScreen();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');

    await rerender(
      <StatusButton status="error" errorLabel="Card declined">
        Pay
      </StatusButton>,
    );
    await flush();
    expect(screen.getByRole('button', { name: 'Card declined' })).toBeOnTheScreen();
  });

  it('can retry from the error state', async () => {
    const onPress = jest.fn();
    await render(
      <StatusButton status="error" onPress={onPress}>
        Pay
      </StatusButton>,
    );
    await activate(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
