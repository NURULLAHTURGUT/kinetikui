import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { StreakCard, type StreakDay } from './streak-card';

const DAYS: StreakDay[] = [
  { label: 'We', state: 'done' },
  { label: 'Th', state: 'today' },
  { label: 'Fr', state: 'upcoming' },
];

describe('StreakCard', () => {
  it('reads the count, the title and the week', async () => {
    await render(<StreakCard count={2} days={DAYS} />);
    expect(screen.getByLabelText('2 day streak')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Back on track' })).toBeOnTheScreen();
    expect(screen.getByLabelText('This week: We done, Th today, Fr upcoming')).toBeOnTheScreen();
  });

  it('updates when the streak grows', async () => {
    const view = await render(<StreakCard count={2} days={DAYS} />);
    await view.rerender(<StreakCard count={3} days={DAYS} />);
    expect(screen.getByLabelText('3 day streak')).toBeOnTheScreen();
  });

  it('calls onContinue from its button', async () => {
    const onContinue = jest.fn();
    await render(
      <StreakCard count={2} days={DAYS} ctaLabel="Keep going" onContinue={onContinue} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Keep going' }));
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
