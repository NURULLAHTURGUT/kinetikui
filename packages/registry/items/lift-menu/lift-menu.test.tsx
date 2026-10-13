import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { LiftMenu } from './lift-menu';

function setup() {
  const open = jest.fn();
  const pin = jest.fn();
  const remove = jest.fn();
  const ui = (
    // Reduced motion closes the menu at once, so actions run straight away.
    <KinetikProvider reduceMotion="always">
      <LiftMenu
        accessibilityLabel="Cloud Forest, Vietnam"
        onPress={open}
        actions={[
          { key: 'pin', label: 'Pin', onPress: pin },
          { key: 'delete', label: 'Delete', destructive: true, onPress: remove },
        ]}
      >
        <Text>Cloud Forest</Text>
      </LiftMenu>
    </KinetikProvider>
  );
  return { ui, open, pin, remove };
}

describe('LiftMenu', () => {
  it('runs the plain tap', async () => {
    const { ui, open } = setup();
    await render(ui);
    await fireEvent.press(screen.getByRole('button', { name: 'Cloud Forest, Vietnam' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Pin' })).toBeNull();
  });

  it('lifts on a long press and runs the chosen action', async () => {
    const { ui, pin } = setup();
    await render(ui);
    await fireEvent(screen.getByRole('button', { name: 'Cloud Forest, Vietnam' }), 'longPress');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Pin' }));
    expect(pin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Pin' })).toBeNull();
  });

  it('offers every action to screen readers', async () => {
    const { ui, remove } = setup();
    await render(ui);
    const card = screen.getByRole('button', { name: 'Cloud Forest, Vietnam' });
    expect(card.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'activate',
      'longpress',
      'pin',
      'delete',
    ]);
    await act(async () => {
      fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
