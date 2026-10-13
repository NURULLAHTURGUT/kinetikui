import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Timeline } from './timeline';

const EVENTS = [
  { key: 'placed', title: 'Order placed', time: 'Mon 09:12' },
  { key: 'packed', title: 'Packed', time: 'Mon 16:40', description: 'Two prints and a frame' },
  { key: 'transit', title: 'On its way', time: 'Today', state: 'current' as const },
  { key: 'delivered', title: 'Delivered', time: 'Thu', state: 'upcoming' as const },
];

describe('Timeline', () => {
  it('reads each event with its time, details and status', async () => {
    await render(<Timeline events={EVENTS} />);
    expect(screen.getByLabelText('Mon 09:12, Order placed')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mon 16:40, Packed. Two prints and a frame')).toBeOnTheScreen();
    expect(screen.getByLabelText('Today, On its way, now')).toBeOnTheScreen();
    expect(screen.getByLabelText('Thu, Delivered, coming up')).toBeOnTheScreen();
  });

  it('renders extra content under an event', async () => {
    await render(
      <Timeline
        events={[{ key: 'a', title: 'Photo added', time: 'Now', children: <Text>Mist Lake</Text> }]}
      />,
    );
    expect(screen.getByText('Mist Lake')).toBeOnTheScreen();
  });
});
