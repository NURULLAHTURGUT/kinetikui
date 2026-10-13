import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { PopMenu } from './pop-menu';

function setup() {
  const share = jest.fn();
  const remove = jest.fn();
  return {
    share,
    remove,
    ui: (
      // Reduced motion closes the menu at once, so actions run straight away.
      <KinetikProvider reduceMotion="always">
        <PopMenu
          accessibilityLabel="More actions"
          items={[
            { key: 'share', label: 'Share', onPress: share },
            { key: 'rename', label: 'Rename', onPress: jest.fn(), disabled: true },
            { key: 'delete', label: 'Delete', onPress: remove, destructive: true },
          ]}
        >
          <Text>•••</Text>
        </PopMenu>
      </KinetikProvider>
    ),
  };
}

describe('PopMenu', () => {
  it('opens from its trigger with menu items', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.queryByRole('menuitem', { name: 'Share' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Share' })).toBeOnTheScreen();
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeDisabled();
  });

  it('runs the chosen action and closes', async () => {
    const { ui, remove } = setup();
    await render(ui);
    await fireEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBeNull();
  });

  it('closes without acting when the backdrop is pressed', async () => {
    const { ui, share } = setup();
    await render(ui);
    await fireEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close menu' }));
    expect(share).not.toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Share' })).toBeNull();
  });
});
