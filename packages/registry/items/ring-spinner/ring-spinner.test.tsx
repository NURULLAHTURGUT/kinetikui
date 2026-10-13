import { render, screen } from '@testing-library/react-native';

import { RingSpinner } from './ring-spinner';

describe('RingSpinner', () => {
  it('is a progress indicator while loading', async () => {
    await render(<RingSpinner accessibilityLabel="Uploading photos" />);
    const spinner = screen.getByRole('progressbar', { name: 'Uploading photos' });
    expect(spinner.props.accessibilityValue).toBeUndefined();
  });

  it('reports a known amount as a percentage', async () => {
    await render(<RingSpinner progress={0.42} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 42,
    });
  });

  it('reads Done and Failed when it settles', async () => {
    const { rerender } = await render(<RingSpinner status="success" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ text: 'Done' });
    await rerender(<RingSpinner status="error" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ text: 'Failed' });
  });
});
