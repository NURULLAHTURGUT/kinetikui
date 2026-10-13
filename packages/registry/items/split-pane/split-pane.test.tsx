import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { SplitPane } from './split-pane';

function Panes({ onChange }: { onChange?: jest.Mock }) {
  return (
    <SplitPane
      testID="split"
      first={<Text>Map</Text>}
      second={<Text>Places</Text>}
      onChange={onChange}
      style={{ height: 412 }}
    />
  );
}

describe('SplitPane', () => {
  it('shows both panes and an adjustable divider at half', async () => {
    await render(<Panes />);
    expect(screen.getByText('Map')).toBeOnTheScreen();
    expect(screen.getByText('Places')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Resize panes' })).toHaveProp(
      'accessibilityValue',
      { text: '50 percent' },
    );
  });

  it('steps between resting points with screen reader actions', async () => {
    const onChange = jest.fn();
    await render(<Panes onChange={onChange} />);
    const divider = screen.getByRole('adjustable', { name: 'Resize panes' });
    for (const actionName of ['increment', 'increment', 'decrement']) {
      await act(async () => {
        fireEvent(divider, 'accessibilityAction', { nativeEvent: { actionName } });
      });
    }
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([0.75, 0.5]);
  });

  it('settles a drag on the nearest resting point', async () => {
    const onChange = jest.fn();
    await render(<Panes onChange={onChange} />);
    await act(async () => {
      fireEvent(screen.getByTestId('split'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 412 } },
      });
    });
    // 400 pt to share: 90 pt down from half is 0.725, nearest 0.75.
    await act(async () => {
      fireGestureHandler(getByGestureTestId('split-pane'), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: 40, velocityY: 0 },
        { state: State.ACTIVE, translationY: 90, velocityY: 0 },
        { state: State.END, translationY: 90, velocityY: 0 },
      ]);
    });
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(0.75);
  });
});
