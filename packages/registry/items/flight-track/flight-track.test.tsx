import { render, screen } from '@testing-library/react-native';

import { FlightTrack } from './flight-track';

const from = { code: 'LHR', city: 'London, UK', time: '20:50', zone: 'GMT+1' };
const to = { code: 'OPO', city: 'Porto, PT', time: '22:40', zone: 'GMT+1' };

describe('FlightTrack', () => {
  it('reads the route, times and progress as one progress bar', async () => {
    await render(<FlightTrack from={from} to={to} progress={0.55} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibleName(
      'LHR, London, UK, to OPO, Porto, PT. Departs 20:50 GMT+1, arrives 22:40 GMT+1.',
    );
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 55, text: '55% of the way' });
  });

  it('shows both stops with their times', async () => {
    await render(<FlightTrack from={from} to={to} progress={0.2} />);
    for (const text of ['LHR', 'OPO', 'Porto, PT', 'DEP', '20:50', 'ETA', '22:40']) {
      expect(screen.getByText(text, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });

  it('clamps progress and takes custom labels', async () => {
    await render(
      <FlightTrack from={from} to={to} progress={1.4} departLabel="Left" arriveLabel="Lands" />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibilityValue({ now: 100 });
    expect(bar).toHaveAccessibleName(
      'LHR, London, UK, to OPO, Porto, PT. Left 20:50 GMT+1, Lands 22:40 GMT+1.',
    );
  });
});
