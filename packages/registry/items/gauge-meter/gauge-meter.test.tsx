import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { GaugeMeter } from './gauge-meter';

describe('GaugeMeter', () => {
  // The figure counts on animation frames; frozen timers keep it still and the tests quiet.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports its value as a progress bar', async () => {
    await render(
      <GaugeMeter accessibilityLabel="Download speed" value={412} max={1000} unit="Mbps" />,
    );
    const gauge = screen.getByRole('progressbar', { name: 'Download speed' });
    expect(gauge.props.accessibilityValue).toEqual({
      min: 0,
      max: 1000,
      now: 412,
      text: '412 Mbps',
    });
  });

  it('labels both ends with the formatter', async () => {
    await render(
      <GaugeMeter
        accessibilityLabel="Battery"
        value={0.5}
        min={0}
        max={1}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />,
    );
    // The figure is still counting up from the minimum, so 0% shows twice for now.
    expect(screen.getAllByText('0%', { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getByText('100%', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows the figure straight away with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <GaugeMeter accessibilityLabel="Score" value={87} />
      </KinetikProvider>,
    );
    expect(screen.getByText('87', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
