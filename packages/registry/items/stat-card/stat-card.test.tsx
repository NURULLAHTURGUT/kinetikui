import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  // The figure counts on animation frames; frozen timers keep it still and the tests quiet.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads as one summary', async () => {
    await render(
      <StatCard
        label="Visitors"
        value={24180}
        delta={0.124}
        caption="vs last week"
        trend={[1, 3, 2]}
      />,
    );
    expect(screen.getByLabelText('Visitors, 24,180, up 12.4%, vs last week')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the figure at once with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <StatCard
          label="Bounce rate"
          value={38.2}
          formatValue={(v) => `${v.toFixed(1)}%`}
          delta={-0.031}
          invertDelta
        />
      </KinetikProvider>,
    );
    expect(screen.getByText('38.2%', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('3.1%', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is a button when it can be pressed', async () => {
    const onPress = jest.fn();
    await render(<StatCard label="Revenue" value={1200} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Revenue, 1,200' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
