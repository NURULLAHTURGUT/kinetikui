import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';

import { LineChart } from './line-chart';

const data = [3, 5, 4, 8];
const labels = ['Jan', 'Feb', 'Mar', 'Apr'];

async function renderChart(props: Partial<Parameters<typeof LineChart>[0]> = {}) {
  const utils = await render(
    <LineChart accessibilityLabel="Sales" data={data} labels={labels} {...props} />,
  );
  await act(async () => {
    fireEvent(screen.getByRole('adjustable'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 200 } },
    });
  });
  return utils;
}

describe('LineChart', () => {
  it('reads the latest value by default', async () => {
    await renderChart({ formatValue: (v) => `${v} units` });
    expect(screen.getByRole('adjustable', { name: 'Sales' })).toHaveAccessibilityValue({
      text: 'Apr: 8 units',
    });
    expect(screen.getByText('Jan')).toBeOnTheScreen();
  });

  it('steps through points with the adjustable actions', async () => {
    const onScrub = jest.fn();
    await renderChart({ onScrub });
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(onScrub).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ text: 'Mar: 4' });
  });

  it('reports the point under the finger and clears when it lifts', async () => {
    const onScrub = jest.fn();
    await renderChart({ onScrub });
    // Points sit at 6, 108.7, 211.3 and 314 across a 320 pt chart.
    await act(async () => {
      fireGestureHandler(getByGestureTestId('line-chart'), [
        { state: State.BEGAN, x: 10, y: 100 },
        { state: State.ACTIVE, x: 110, y: 100 },
        { state: State.ACTIVE, x: 205, y: 100 },
        { state: State.END, x: 205, y: 100 },
      ]);
    });
    await flush();
    expect(onScrub.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, null]);
  });
});
