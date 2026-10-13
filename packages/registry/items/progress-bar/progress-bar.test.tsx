import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ProgressBar } from './progress-bar';

const instant = (ui: ReactElement) => <KinetikProvider reduceMotion="always">{ui}</KinetikProvider>;

describe('ProgressBar', () => {
  it('is a progress bar with its value', async () => {
    await render(instant(<ProgressBar label="Uploading" value={0.42} />));
    const bar = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(bar).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 42 });
    expect(bar).toHaveProp('accessibilityState', { busy: true });
    expect(screen.getByText('42%', { includeHiddenElements: true })).toBeTruthy();
  });

  it('says Done when full', async () => {
    await render(instant(<ProgressBar label="Uploading" value={1} />));
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityState', { busy: false });
    expect(screen.getByText('Done', { includeHiddenElements: true })).toBeTruthy();
  });

  it('has no value while indeterminate', async () => {
    await render(<ProgressBar label="Preparing" value={null} />);
    const bar = screen.getByRole('progressbar', { name: 'Preparing' });
    expect(bar.props.accessibilityValue).toBeUndefined();
    expect(screen.queryByText(/%$/, { includeHiddenElements: true })).toBeNull();
  });
});
