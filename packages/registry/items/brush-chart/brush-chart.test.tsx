import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { BrushChart, windowIndices } from './brush-chart';

// 31 points: 0, 10, 20, ... 300.
const DATA = Array.from({ length: 31 }, (_, i) => i * 10);
const LABELS = DATA.map((_, i) => `Day ${i + 1}`);

describe('windowIndices', () => {
  it('covers the points inside the window', () => {
    expect(windowIndices(31, 0, 1)).toEqual([0, 30]);
    expect(windowIndices(31, 0.5, 1)).toEqual([15, 30]);
    expect(windowIndices(31, 0.51, 0.69)).toEqual([15, 21]);
  });
});

describe('BrushChart', () => {
  it('describes the visible part and names the range control', async () => {
    await render(
      <BrushChart
        accessibilityLabel="Visitors"
        data={DATA}
        labels={LABELS}
        initialWindow={[0.5, 1]}
      />,
    );
    expect(
      screen.getByRole('image', { name: 'Visitors, Day 16 to Day 31, from 150 to 300' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Visitors range' })).toHaveProp(
      'accessibilityValue',
      { text: 'Day 16 to Day 31' },
    );
  });

  it('moves the window back with a screen reader action', async () => {
    const onWindowChange = jest.fn();
    await render(
      <BrushChart
        accessibilityLabel="Visitors"
        data={DATA}
        initialWindow={[0.5, 1]}
        onWindowChange={onWindowChange}
      />,
    );
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(onWindowChange).toHaveBeenLastCalledWith([7, 23]);
  });

  it('drags the window across the strip', async () => {
    const onWindowChange = jest.fn();
    await render(
      <BrushChart
        accessibilityLabel="Visitors"
        data={DATA}
        initialWindow={[0, 0.5]}
        onWindowChange={onWindowChange}
      />,
    );
    await act(async () => {
      fireEvent(screen.getByRole('image'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 180 } },
      });
    });
    await act(async () => {
      fireGestureHandler(getByGestureTestId('brush-chart'), [
        { state: State.BEGAN, x: 75, y: 20, translationX: 0 },
        { state: State.ACTIVE, x: 75, y: 20, translationX: 0 },
        { state: State.ACTIVE, x: 135, y: 20, translationX: 60 },
        { state: State.END, x: 135, y: 20, translationX: 60 },
      ]);
    });
    await flush();
    expect(onWindowChange).toHaveBeenLastCalledWith([6, 21]);
  });
});
