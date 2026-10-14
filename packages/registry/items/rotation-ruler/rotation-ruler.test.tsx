import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { RotationRuler, type RotationRulerProps } from './rotation-ruler';

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

function Harness(props: Partial<RotationRulerProps>) {
  const [value, setValue] = useState(props.value ?? 10);
  return (
    <RotationRuler
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

describe('RotationRuler', () => {
  it('reads the angle in degrees and steps by one', async () => {
    const onValueChange = jest.fn();
    await render(<Harness onValueChange={onValueChange} />);
    expect(screen.getByRole('adjustable', { name: 'Rotation' })).toHaveAccessibilityValue({
      min: -45,
      max: 45,
      now: 10,
      text: '10 degrees',
    });
    await action('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(11);
  });

  it('turns the angle up when the ruler is dragged left', async () => {
    const onSlidingComplete = jest.fn();
    await render(<Harness onSlidingComplete={onSlidingComplete} />);
    await layout(300);
    // 8 pt per degree: 80 pt to the left is +10 degrees.
    await drag('rotation-ruler', [200, 160, 120]);
    expect(onSlidingComplete).toHaveBeenLastCalledWith(20);
  });

  it('snaps to level when it rests close to zero', async () => {
    const onSlidingComplete = jest.fn();
    await render(<Harness value={-6} onSlidingComplete={onSlidingComplete} />);
    await layout(300);
    await drag('rotation-ruler', [150, 130, 112]);
    expect(onSlidingComplete).toHaveBeenLastCalledWith(0);
  });

  it('clamps at the ends', async () => {
    const onSlidingComplete = jest.fn();
    await render(<Harness value={40} onSlidingComplete={onSlidingComplete} />);
    await layout(300);
    await drag('rotation-ruler', [250, 100, 0]);
    expect(onSlidingComplete).toHaveBeenLastCalledWith(45);
  });
});
