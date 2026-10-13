import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { KinetikProvider } from '../../shared/tokens/theme';
import { SwipeRow } from './swipe-row';

function setup() {
  const archive = jest.fn();
  const flag = jest.fn();
  const pin = jest.fn();
  const ui = (
    <KinetikProvider reduceMotion="always">
      <SwipeRow
        testID="row"
        accessibilityLabel="Mara, Lunch on Friday?"
        leading={{ key: 'pin', label: 'Pin', tone: 'azure', onPress: pin }}
        trailing={[
          { key: 'archive', label: 'Archive', tone: 'danger', dismiss: true, onPress: archive },
          { key: 'flag', label: 'Flag', tone: 'warning', onPress: flag },
        ]}
      >
        <Text>Lunch on Friday?</Text>
      </SwipeRow>
    </KinetikProvider>
  );
  return { ui, archive, flag, pin };
}

async function swipe(dx: number) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('swipe-row'), [
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: dx / 2, velocityX: 0 },
      { state: State.ACTIVE, translationX: dx, velocityX: 0 },
      { state: State.END, translationX: dx, velocityX: 0 },
    ]);
  });
  await flush();
}

describe('SwipeRow', () => {
  it('offers its actions to screen readers', async () => {
    const { ui, flag } = setup();
    await render(ui);
    const row = screen.getByLabelText('Mara, Lunch on Friday?');
    expect(row.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Pin',
      'Archive',
      'Flag',
    ]);
    await act(async () => {
      fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'flag' } });
    });
    expect(flag).toHaveBeenCalledTimes(1);
  });

  it('opens on a short swipe and closes from the row', async () => {
    const { ui, archive } = setup();
    await render(ui);
    await act(async () => {
      fireEvent(screen.getByTestId('row'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 72 } },
      });
    });
    await swipe(-120);
    expect(archive).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Close actions' }));
    expect(screen.queryByRole('button', { name: 'Close actions' })).toBeNull();
  });

  it('runs the edge action on a full swipe', async () => {
    const { ui, archive } = setup();
    await render(ui);
    await act(async () => {
      fireEvent(screen.getByTestId('row'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 72 } },
      });
    });
    await swipe(-300);
    expect(archive).toHaveBeenCalledTimes(1);
  });
});
