import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows a heading, a description and the next steps', async () => {
    const create = jest.fn();
    const learn = jest.fn();
    await render(
      <EmptyState
        title="No trips yet"
        description="Save places you would like to visit and they will show up here."
        action={{ label: 'Find a place', onPress: create }}
        secondaryAction={{ label: 'How saving works', onPress: learn }}
      />,
    );
    expect(screen.getByRole('header', { name: 'No trips yet' })).toBeOnTheScreen();
    expect(screen.getByText(/Save places you would like/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Find a place' }));
    await fireEvent.press(screen.getByRole('button', { name: 'How saving works' }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(learn).toHaveBeenCalledTimes(1);
  });

  it('works without actions', async () => {
    await render(<EmptyState title="All caught up" />);
    expect(screen.getByRole('header', { name: 'All caught up' })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
