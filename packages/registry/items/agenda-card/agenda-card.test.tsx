import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AgendaCard, type AgendaEvent } from './agenda-card';

const EVENTS: AgendaEvent[] = [
  { id: '1', title: 'Team standup', start: '09:30', end: '09:45' },
  { id: '2', title: 'Deep work', start: '10:00', end: '12:00', progress: 0.4 },
  { id: '3', title: 'Design review', start: '13:30', end: '14:30' },
  { id: '4', title: 'Gym', start: '18:00', end: '19:00' },
];

describe('AgendaCard', () => {
  it('reads the day and lists the first events', async () => {
    await render(<AgendaCard date="Oct 30" weekday="Thursday" events={EVENTS} total={6} />);
    expect(screen.getByLabelText('Thursday, Oct 30, 6 events')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'UPCOMING' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Deep work, 10:00 to 12:00, now')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Gym, 18:00 to 19:00')).toBeNull();
  });

  it('counts the events when no total is given', async () => {
    await render(<AgendaCard date="Oct 31" weekday="Friday" events={EVENTS.slice(0, 1)} />);
    expect(screen.getByLabelText('Friday, Oct 31, 1 event')).toBeOnTheScreen();
  });

  it('adds and opens events', async () => {
    const onAdd = jest.fn();
    const onEventPress = jest.fn();
    await render(
      <AgendaCard
        date="Oct 30"
        weekday="Thursday"
        events={EVENTS}
        onAdd={onAdd}
        onEventPress={onEventPress}
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add event' }));
    });
    expect(onAdd).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Team standup, 09:30 to 09:45' }));
    });
    expect(onEventPress).toHaveBeenCalledWith(EVENTS[0]);
  });

  it('has no add button without onAdd', async () => {
    await render(<AgendaCard date="Oct 30" weekday="Thursday" events={EVENTS} />);
    expect(screen.queryByRole('button', { name: 'Add event' })).toBeNull();
  });
});
