import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { ElasticSlider, type ElasticSliderProps } from './elastic-slider';

function Harness(props: Partial<ElasticSliderProps>) {
  const [value, setValue] = useState(props.value ?? 50);
  return (
    <ElasticSlider
      label="Volume"
      min={0}
      max={100}
      step={1}
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const action = async (name: 'increment' | 'decrement') => {
  await act(async () => {
    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: name },
    });
  });
};

describe('ElasticSlider', () => {
  it('exposes an adjustable control with its value', async () => {
    await render(<Harness formatValue={(v) => `${v}%`} />);
    const slider = screen.getByRole('adjustable', { name: 'Volume' });
    expect(slider).toHaveAccessibilityValue({ min: 0, max: 100, now: 50, text: '50%' });
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });

  it('increments and decrements by at least 5% of the range', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await action('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(55);
    await action('decrement');
    await action('decrement');
    expect(onValueChange).toHaveBeenLastCalledWith(45);
  });

  it('clamps at the ends', async () => {
    const onValueChange = jest.fn();
    await render(<Harness value={98} onValueChange={onValueChange} />);
    await action('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(100);
  });

  it('follows a drag and reports completion', async () => {
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    await render(<Harness onValueChange={onValueChange} onSlidingComplete={onSlidingComplete} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
      });
    });
    await act(async () => {
      fireGestureHandler(getByGestureTestId('elastic-slider'), [
        { state: State.BEGAN, x: 100 },
        { state: State.ACTIVE, x: 150 },
        { state: State.ACTIVE, x: 180 },
        { state: State.END, x: 180 },
      ]);
    });
    await flush();
    expect(onValueChange).toHaveBeenLastCalledWith(90);
    expect(onSlidingComplete).toHaveBeenCalledWith(90);
  });

  it('ignores input while disabled', async () => {
    const onValueChange = jest.fn();
    await render(<Harness disabled onValueChange={onValueChange} />);
    await action('increment');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('adjustable')).toBeDisabled();
  });
});
