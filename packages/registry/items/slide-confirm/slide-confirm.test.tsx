import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { activate, flush } from '../../jest/helpers';
import { SlideConfirm } from './slide-confirm';

async function layout(width = 320) {
  await act(async () => {
    fireEvent(screen.getByRole('button'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 64 } },
    });
  });
}

async function drag(to: number) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('slide-confirm'), [
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: to / 2, velocityX: 100 },
      { state: State.ACTIVE, translationX: to, velocityX: 100 },
      { state: State.END, translationX: to, velocityX: 100 },
    ]);
  });
  await flush();
}

describe('SlideConfirm', () => {
  it('confirms when dragged past the threshold', async () => {
    const onConfirm = jest.fn();
    await render(<SlideConfirm label="Slide to pay" confirmedLabel="Paid" onConfirm={onConfirm} />);
    await layout();
    await drag(300);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Paid' })).toBeOnTheScreen();
  });

  it('springs back when let go early', async () => {
    const onConfirm = jest.fn();
    await render(<SlideConfirm label="Slide to pay" onConfirm={onConfirm} />);
    await layout();
    await drag(80);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Slide to pay' })).toBeOnTheScreen();
  });

  it('confirms from the screen-reader activate action', async () => {
    const onConfirm = jest.fn();
    await render(<SlideConfirm label="Slide to pay" onConfirm={onConfirm} />);
    await layout();
    await activate(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const onConfirm = jest.fn();
    await render(<SlideConfirm label="Slide to pay" onConfirm={onConfirm} disabled />);
    await layout();
    await activate(screen.getByRole('button'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
