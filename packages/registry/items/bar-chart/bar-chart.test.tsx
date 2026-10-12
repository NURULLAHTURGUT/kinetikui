import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';

import { BarChart } from './bar-chart';

const data = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 9 },
  { label: 'Wed', value: 6 },
];

describe('BarChart', () => {
  it('labels every bar', async () => {
    await render(<BarChart accessibilityLabel="Steps" data={data} />);
    expect(screen.getByRole('adjustable', { name: 'Steps' })).toBeOnTheScreen();
    for (const d of data) expect(screen.getByText(d.label)).toBeOnTheScreen();
  });

  it('selects bars with the adjustable actions', async () => {
    const onSelect = jest.fn();
    await render(
      <BarChart
        accessibilityLabel="Steps"
        data={data}
        onSelect={onSelect}
        formatValue={(v) => `${v}k`}
      />,
    );
    const chart = screen.getByRole('adjustable');
    await act(async () => {
      fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    await act(async () => {
      fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(chart).toHaveAccessibilityValue({ text: 'Tue: 9k' });
    expect(screen.getByText('9k')).toBeOnTheScreen();
  });

  it('selects the bar under the finger and clears on a second tap', async () => {
    const onSelect = jest.fn();
    await render(<BarChart accessibilityLabel="Steps" data={data} onSelect={onSelect} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 210 } },
      });
    });
    const drag = async (events: { state: (typeof State)[keyof typeof State]; x: number }[]) => {
      await act(async () => {
        fireGestureHandler(
          getByGestureTestId('bar-chart'),
          events.map((e) => ({ ...e, y: 50 })),
        );
      });
      await flush();
    };
    await drag([
      { state: State.BEGAN, x: 20 },
      { state: State.ACTIVE, x: 160 },
      { state: State.END, x: 160 },
    ]);
    expect(onSelect).toHaveBeenLastCalledWith(1);
    await drag([
      { state: State.BEGAN, x: 150 },
      { state: State.ACTIVE, x: 150 },
      { state: State.END, x: 150 },
    ]);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
