import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { HeatGrid } from './heat-grid';

// Two weeks: the first column is week one, top to bottom.
const data = [0, 1, 2, 3, 4, 0, 0, 5, 6, 7, 8, 0, 0, 9];
const describe14 = (i: number, v: number) => `Day ${i + 1} · ${v} rides`;

async function layout() {
  await fireEvent(screen.getByRole('adjustable'), 'layout', {
    nativeEvent: { layout: { width: 200, height: 100 } },
  });
}

describe('HeatGrid', () => {
  it('reads the total until a day is chosen', async () => {
    await render(<HeatGrid accessibilityLabel="Rides" data={data} />);
    expect(screen.getByRole('adjustable', { name: 'Rides' }).props.accessibilityValue).toEqual({
      text: '45 in total',
    });
  });

  it('steps through days with the adjust actions', async () => {
    const onSelect = jest.fn();
    await render(
      <HeatGrid accessibilityLabel="Rides" data={data} describe={describe14} onSelect={onSelect} />,
    );
    const grid = () => screen.getByRole('adjustable');
    await act(async () => {
      fireEvent(grid(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(onSelect).toHaveBeenLastCalledWith(12);
    expect(grid().props.accessibilityValue).toEqual({ text: 'Day 13 · 0 rides' });
  });

  it('selects the cell under the finger and clears on a second tap', async () => {
    const onSelect = jest.fn();
    await render(
      <HeatGrid
        accessibilityLabel="Rides"
        data={data}
        rowLabels={[]}
        gap={4}
        describe={describe14}
        onSelect={onSelect}
      />,
    );
    await layout();
    // 200 pt wide, two columns: cells are capped at 22 pt, so a pitch of 26.
    const tap = async (x: number, y: number) => {
      await act(async () => {
        fireGestureHandler(getByGestureTestId('heat-grid'), [
          { state: State.BEGAN, x, y },
          { state: State.END, x, y },
        ]);
      });
      await flush();
    };
    await tap(30, 60); // second column, third row
    expect(onSelect).toHaveBeenLastCalledWith(9);
    expect(screen.getByText('Day 10 · 7 rides')).toBeOnTheScreen();
    await tap(30, 60);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
