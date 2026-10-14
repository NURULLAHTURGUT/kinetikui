import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { IntensitySlider, type IntensitySliderProps } from './intensity-slider';

function Harness(props: Partial<IntensitySliderProps>) {
  const [value, setValue] = useState(props.value ?? 40);
  return (
    <IntensitySlider
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

describe('IntensitySlider', () => {
  it('reads the value as a percentage and steps by 5', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    const slider = screen.getByRole('adjustable', { name: 'Intensity' });
    expect(slider).toHaveAccessibilityValue({ min: 0, max: 100, now: 40, text: '40%' });
    await act(async () => {
      fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onValueChange).toHaveBeenLastCalledWith(45);
  });

  it('follows a drag', async () => {
    const onSlidingComplete = jest.fn();
    await render(<Harness onSlidingComplete={onSlidingComplete} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
      });
    });
    await act(async () => {
      fireGestureHandler(getByGestureTestId('intensity-slider'), [
        { state: State.BEGAN, x: 80 },
        { state: State.ACTIVE, x: 120 },
        { state: State.ACTIVE, x: 150 },
        { state: State.END, x: 150 },
      ]);
    });
    await flush();
    expect(onSlidingComplete).toHaveBeenCalledWith(75);
  });

  it('labels its ends', async () => {
    await render(<Harness lowLabel="Soft" highLabel="Strong" label="Blur" />);
    expect(screen.getByText('Soft')).toBeOnTheScreen();
    expect(screen.getByText('Strong')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Blur' })).toBeOnTheScreen();
  });
});
