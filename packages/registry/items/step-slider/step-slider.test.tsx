import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { StepSlider, type StepSliderProps } from './step-slider';

const action = async (name: 'increment' | 'decrement') => {
  await act(async () => {
    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: name },
    });
  });
};

const layout = async (width: number) => {
  await act(async () => {
    fireEvent(screen.getByRole('adjustable'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } },
    });
  });
};

const drag = async (id: string, xs: number[]) => {
  const first = xs[0]!;
  const last = xs[xs.length - 1]!;
  await act(async () => {
    fireGestureHandler(getByGestureTestId(id), [
      { state: State.BEGAN, x: first, translationX: 0 },
      ...xs.map((x) => ({ state: State.ACTIVE, x, translationX: x - first })),
      { state: State.END, x: last, translationX: last - first, velocityX: 0 },
    ]);
  });
  await flush();
};

function Harness(props: Partial<StepSliderProps>) {
  const [value, setValue] = useState(props.value ?? 0);
  return (
    <StepSlider
      label="Creativity"
      labels={['Subtle', 'Balanced', 'Bold', 'Wild']}
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

describe('StepSlider', () => {
  it('reads the stop by name and moves one stop at a time', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    expect(screen.getByRole('adjustable', { name: 'Creativity' })).toHaveAccessibilityValue({
      min: 0,
      max: 3,
      now: 0,
      text: 'Subtle',
    });
    await action('decrement');
    expect(onValueChange).not.toHaveBeenCalled();
    await action('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ text: 'Balanced' });
  });

  it('snaps a drag to the nearest stop', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    // 322 wide with a 22 pt knob: a stop every 100 pt.
    await layout(322);
    await drag('step-slider', [11, 150, 230]);
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(<Harness action={{ icon: null, label: 'Generate again', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Generate again' }));
    expect(onPress).toHaveBeenCalled();
  });
});
