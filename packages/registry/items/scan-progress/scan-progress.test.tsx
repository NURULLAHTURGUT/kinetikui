import { render, screen } from '@testing-library/react-native';

import { ScanProgress } from './scan-progress';

describe('ScanProgress', () => {
  it('is a progress bar named by the current step', async () => {
    await render(<ScanProgress label="Analyzing swing motion…" progress={0.42} />);
    const bar = screen.getByRole('progressbar', { name: 'Analyzing swing motion…' });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 42 });
  });

  it('has no value when progress is unknown', async () => {
    await render(<ScanProgress label="Uploading…" />);
    expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toHaveAccessibilityValue({});
  });

  it('switches to the done label at 100%', async () => {
    const { rerender } = await render(<ScanProgress label="Scoring…" progress={0.9} />);
    await rerender(<ScanProgress label="Scoring…" progress={1} done doneLabel="Swing analysed" />);
    const bar = screen.getByRole('progressbar', { name: 'Swing analysed' });
    expect(bar).toHaveAccessibilityValue({ now: 100 });
  });

  it('describes the image when asked to', async () => {
    await render(
      <ScanProgress label="Analyzing…" imageLabel="Golfer at the top of the swing" progress={0} />,
    );
    expect(screen.getByRole('image', { name: 'Golfer at the top of the swing' })).toBeOnTheScreen();
  });
});
