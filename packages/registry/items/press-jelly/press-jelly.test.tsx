import { render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { activate, tapGesture } from '../../jest/helpers';
import { KinetikProvider } from '../../shared/tokens/theme';
import { PressJelly } from './press-jelly';

describe('PressJelly', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a labelled button', async () => {
    await render(<PressJelly>Continue</PressJelly>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('calls onPress and plays a light haptic on tap', async () => {
    const onPress = jest.fn();
    await render(<PressJelly onPress={onPress}>Continue</PressJelly>);
    await tapGesture('press-jelly');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('stays silent when haptics are off globally', async () => {
    await render(
      <KinetikProvider haptics={false}>
        <PressJelly onPress={() => {}}>Continue</PressJelly>
      </KinetikProvider>,
    );
    await tapGesture('press-jelly');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('ignores presses while disabled or loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(
      <PressJelly onPress={onPress} disabled>
        Continue
      </PressJelly>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    await activate(screen.getByRole('button'));

    await rerender(
      <PressJelly onPress={onPress} loading>
        Continue
      </PressJelly>,
    );
    expect(screen.getByRole('button')).toBeBusy();
    await activate(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('presses from the screen-reader activate action', async () => {
    const onPress = jest.fn();
    await render(<PressJelly onPress={onPress}>Continue</PressJelly>);
    await activate(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
