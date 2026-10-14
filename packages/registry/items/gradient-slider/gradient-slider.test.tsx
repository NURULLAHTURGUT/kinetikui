import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import {
  GRADIENT_PRESETS,
  GradientSlider,
  colorAt,
  type GradientSliderProps,
} from './gradient-slider';

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

function Harness(props: Partial<GradientSliderProps>) {
  const [value, setValue] = useState(props.value ?? 180);
  return (
    <GradientSlider
      label="Hue"
      min={0}
      max={360}
      step={1}
      {...props}
      value={value}
      onValueChange={(v, c) => {
        setValue(v);
        props.onValueChange?.(v, c);
      }}
    />
  );
}

describe('colorAt', () => {
  it('blends between stops as hsl()', () => {
    expect(colorAt(GRADIENT_PRESETS.hue, 0)).toBe('hsl(0, 85%, 58%)');
    expect(colorAt(GRADIENT_PRESETS.hue, 0.5)).toBe('hsl(180, 85%, 58%)');
    expect(
      colorAt(
        [
          [0, 0, 0],
          [100, 100, 100],
        ],
        0.25,
      ),
    ).toBe('hsl(25, 25%, 25%)');
  });
});

describe('GradientSlider', () => {
  it('reports the value with the colour under the knob', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    await action('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(198, 'hsl(198, 85%, 58%)');
  });

  it('follows a drag', async () => {
    const onSlidingComplete = jest.fn();
    await render(<Harness onSlidingComplete={onSlidingComplete} />);
    // 388 wide with a 28 pt bar end leaves 360 pt of travel: one degree per point.
    await layout(388);
    await drag('gradient-slider', [100, 50, 14]);
    expect(onSlidingComplete).toHaveBeenCalledWith(0, 'hsl(0, 85%, 58%)');
  });

  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(<Harness action={{ icon: null, label: 'Reset', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
    expect(onPress).toHaveBeenCalled();
  });
});
