import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FoldPanel } from './fold-panel';

describe('FoldPanel', () => {
  it('unfolds and folds, hiding the body from screen readers while folded', async () => {
    const onOpenChange = jest.fn();
    await render(
      <FoldPanel title="Check-in" subtitle="From 3 pm" onOpenChange={onOpenChange}>
        <Text>Self check-in with a lockbox.</Text>
      </FoldPanel>,
    );
    const header = () => screen.getByRole('button', { name: 'Check-in, From 3 pm' });
    expect(header()).toBeCollapsed();
    expect(screen.queryByText('Self check-in with a lockbox.')).toBeNull();

    await fireEvent.press(header());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(header()).toBeExpanded();
    expect(screen.getByText('Self check-in with a lockbox.')).toBeOnTheScreen();

    await fireEvent.press(header());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(header()).toBeCollapsed();
  });

  it('follows a controlled value', async () => {
    const onOpenChange = jest.fn();
    await render(
      <FoldPanel title="Rules" open onOpenChange={onOpenChange}>
        <Text>No parties.</Text>
      </FoldPanel>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Rules' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button', { name: 'Rules' })).toBeExpanded();
  });
});
