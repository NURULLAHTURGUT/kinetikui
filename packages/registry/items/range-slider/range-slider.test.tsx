import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { RangeSlider } from './range-slider';

function Harness({ onComplete }: { onComplete?: jest.Mock }) {
  const [value, setValue] = useState<[number, number]>([20, 60]);
  return (
    <RangeSlider
      testID="range-slider"
      label="Price"
      value={value}
      onValueChange={setValue}
      onSlidingComplete={onComplete}
      step={10}
      formatValue={(v) => `$${v}`}
    />
  );
}

const ends = () => screen.getAllByRole('adjustable').map((e) => e.props.accessibilityValue.now);

describe('RangeSlider', () => {
  it('shows the range and names both ends', async () => {
    await render(<Harness />);
    expect(screen.getByText('$20 – $60')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Price, Minimum' })).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Price, Maximum' })).toBeOnTheScreen();
  });

  it('moves either end with screen reader actions, never past the other', async () => {
    await render(<Harness />);
    const low = screen.getByRole('adjustable', { name: 'Price, Minimum' });
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        fireEvent(low, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      });
    }
    // Stops one step short of the maximum.
    expect(ends()).toEqual([50, 60]);
  });

  it('drags the nearer end and reports when the finger lifts', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    // Give the track a width: 326 - 26 for the thumb = 300 pt, so 3 pt per unit.
    await act(async () => {
      fireEvent(screen.getByTestId('range-slider-track'), 'layout', {
        nativeEvent: { layout: { width: 326, height: 44, x: 0, y: 0 } },
      });
    });
    await act(async () => {
      fireGestureHandler(getByGestureTestId('range-slider'), [
        { state: State.BEGAN, x: 13 + 180, y: 20 },
        { state: State.ACTIVE, x: 13 + 180, y: 20 },
        { state: State.ACTIVE, x: 13 + 270, y: 20 },
        { state: State.END, x: 13 + 270, y: 20 },
      ]);
    });
    await flush();
    expect(onComplete).toHaveBeenLastCalledWith([20, 90]);
    expect(ends()).toEqual([20, 90]);
  });
});
