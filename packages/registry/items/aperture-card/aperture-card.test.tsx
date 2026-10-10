import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { activate, tapGesture } from '../../jest/helpers';
import { ApertureCard } from './aperture-card';

describe('ApertureCard', () => {
  it('hides the content from screen readers until open', async () => {
    await render(
      <ApertureCard accessibilityLabel="Reward" cover={<Text>Tap to open</Text>}>
        <Text>Secret</Text>
      </ApertureCard>,
    );
    expect(screen.getByRole('button', { name: 'Reward' })).toBeCollapsed();
    expect(screen.queryByText('Secret')).toBeNull();
    expect(screen.getByText('Secret', { includeHiddenElements: true })).toBeTruthy();
  });

  it('opens on tap and reports the change', async () => {
    const onOpenChange = jest.fn();
    await render(
      <ApertureCard accessibilityLabel="Reward" onOpenChange={onOpenChange}>
        <Text>Secret</Text>
      </ApertureCard>,
    );
    await tapGesture('aperture-card');
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toBeExpanded();
    expect(screen.getByText('Secret')).toBeOnTheScreen();
  });

  it('opens from the screen-reader activate action', async () => {
    const onOpenChange = jest.fn();
    await render(
      <ApertureCard accessibilityLabel="Reward" onOpenChange={onOpenChange}>
        <Text>Secret</Text>
      </ApertureCard>,
    );
    await activate(screen.getByRole('button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('respects the controlled value and clamps the blade count', async () => {
    await render(
      <ApertureCard open blades={42} accessibilityLabel="Reward">
        <Text>Secret</Text>
      </ApertureCard>,
    );
    expect(screen.getByText('Secret')).toBeOnTheScreen();
  });
});
