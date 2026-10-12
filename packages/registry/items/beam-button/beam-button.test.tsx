import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { activate, tapGesture } from '../../jest/helpers';
import { BeamButton } from './beam-button';

describe('BeamButton', () => {
  it('renders a labelled button', async () => {
    await render(<BeamButton>Upgrade</BeamButton>);
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeOnTheScreen();
  });

  it('calls onPress on tap and from the activate action', async () => {
    const onPress = jest.fn();
    await render(<BeamButton onPress={onPress}>Upgrade</BeamButton>);
    await tapGesture('beam-button');
    await activate(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <BeamButton onPress={onPress} disabled>
        Upgrade
      </BeamButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    await activate(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('takes a node label with an accessible name', async () => {
    await render(
      <BeamButton accessibilityLabel="Start" leading={<Text>*</Text>}>
        <Text>Start</Text>
      </BeamButton>,
    );
    expect(screen.getByRole('button', { name: 'Start' })).toBeOnTheScreen();
  });
});
