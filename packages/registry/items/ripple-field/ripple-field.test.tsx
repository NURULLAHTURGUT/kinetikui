import { act, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { runtimeEffect } from '../../shared/shaders/sksl';
import { RippleField } from './ripple-field';
import { RIPPLE_SHADER } from './ripple-field.shader';

describe('RippleField', () => {
  beforeEach(() => jest.clearAllMocks());

  it('compiles its shader', () => {
    expect(() => runtimeEffect(RIPPLE_SHADER)).not.toThrow();
  });

  it('renders children', async () => {
    await render(
      <RippleField>
        <Text>Touch anywhere</Text>
      </RippleField>,
    );
    expect(screen.getByText('Touch anywhere')).toBeOnTheScreen();
  });

  it('starts a ripple on touch, with a haptic only when asked', async () => {
    await render(<RippleField haptics />);
    await act(async () => {
      fireGestureHandler(getByGestureTestId('ripple-field'), [
        { state: State.BEGAN },
        { state: State.END },
      ]);
    });
    await flush();
    expect(() => getByGestureTestId('ripple-field')).not.toThrow();
  });

  it('does not vibrate by default', async () => {
    await render(<RippleField />);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
