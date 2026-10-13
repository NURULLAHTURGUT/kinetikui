import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { UsageMeter } from './usage-meter';

const SEGMENTS = [
  { label: 'Photos', value: 92 },
  { label: 'Video', value: 48 },
  { label: 'Apps', value: 21 },
];

function renderMeter(total: number) {
  return render(
    <KinetikProvider reduceMotion="always">
      <UsageMeter title="Storage" unit="GB" total={total} segments={SEGMENTS} />
    </KinetikProvider>,
  );
}

describe('UsageMeter', () => {
  it('reads what is used, what is left and every segment', async () => {
    await renderMeter(256);
    const meter = screen.getByRole('progressbar', { name: 'Storage' });
    expect(meter.props.accessibilityValue).toEqual({
      min: 0,
      max: 256,
      now: 161,
      text: '161 of 256 GB used, 95 GB left. Photos 92 GB, Video 48 GB, Apps 21 GB',
    });
    expect(screen.getByText('95 GB left')).toBeOnTheScreen();
  });

  it('says how far over the allowance it is', async () => {
    await renderMeter(128);
    expect(screen.getByText('33 GB over')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(128);
  });
});
