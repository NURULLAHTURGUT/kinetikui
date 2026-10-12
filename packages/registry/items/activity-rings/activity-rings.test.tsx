import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActivityRings, type ActivityRing } from './activity-rings';

const rings: ActivityRing[] = [
  { key: 'move', label: 'Move', value: 420, goal: 600 },
  { key: 'walk', label: 'Walk', value: 9800, goal: 8000 },
];

describe('ActivityRings', () => {
  it('describes every ring with its share of the goal', async () => {
    await render(<ActivityRings accessibilityLabel="Today" rings={rings} />);
    expect(
      screen.getByRole('image', { name: 'Today. Move 420 / 600, 70%; Walk 9800 / 8000, 123%' }),
    ).toBeOnTheScreen();
  });

  it('brings a ring forward from the legend, and lets it go again', async () => {
    await render(<ActivityRings accessibilityLabel="Today" rings={rings} />);
    const walk = () => screen.getByRole('button', { name: 'Walk, 9800 / 8000, 123%' });
    await fireEvent.press(walk());
    expect(walk()).toBeSelected();
    await fireEvent.press(walk());
    expect(walk()).not.toBeSelected();
  });

  it('shows the centre slot and can hide the legend', async () => {
    await render(
      <ActivityRings
        accessibilityLabel="Today"
        rings={rings}
        legend={false}
        center={<Text>Tuesday</Text>}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Tuesday', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
