import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { activate, flush } from '../../jest/helpers';
import { HoldToConfirm } from './hold-to-confirm';

const longpress = async () => {
  await act(async () => {
    fireEvent(screen.getByRole('button'), 'accessibilityAction', {
      nativeEvent: { actionName: 'longpress' },
    });
  });
};

describe('HoldToConfirm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a labelled button with a hold hint', async () => {
    await render(<HoldToConfirm label="Hold to delete" onConfirm={() => {}} />);
    const button = screen.getByRole('button', { name: 'Hold to delete' });
    expect(button.props.accessibilityHint).toBe('Double tap and hold to confirm');
  });

  it('confirms when the hold completes', async () => {
    const onConfirm = jest.fn();
    await render(
      <HoldToConfirm label="Hold to delete" confirmedLabel="Deleted" onConfirm={onConfirm} />,
    );
    await act(async () => {
      fireGestureHandler(getByGestureTestId('hold-to-confirm'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]);
    });
    await flush();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(screen.getByRole('button', { name: 'Deleted' })).toBeOnTheScreen();
  });

  // Releasing early is verified on device: RNGH's fireGestureHandler always appends
  // an END event (and fills in ACTIVE) after a FAILED one, so it cannot express it.

  it('confirms from the screen-reader long-press action, not from activate', async () => {
    const onConfirm = jest.fn();
    await render(<HoldToConfirm label="Hold to delete" onConfirm={onConfirm} />);
    await activate(screen.getByRole('button'));
    expect(onConfirm).not.toHaveBeenCalled();
    await longpress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('returns to idle after resetAfter', async () => {
    jest.useFakeTimers();
    await render(
      <HoldToConfirm label="Hold" confirmedLabel="Done" resetAfter={500} onConfirm={() => {}} />,
    );
    await longpress();
    expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByRole('button', { name: 'Hold' })).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('ignores holds while disabled', async () => {
    const onConfirm = jest.fn();
    await render(<HoldToConfirm label="Hold" disabled onConfirm={onConfirm} />);
    await longpress();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
