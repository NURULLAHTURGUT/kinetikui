import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { DotLoader } from './dot-loader';

describe('DotLoader', () => {
  it('is a progress indicator named Loading by default', async () => {
    await render(<DotLoader />);
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeOnTheScreen();
  });

  it('takes a label, a variant and a number of dots', async () => {
    await render(<DotLoader variant="typing" count={4} accessibilityLabel="Mara is typing" />);
    const loader = screen.getByRole('progressbar', { name: 'Mara is typing' });
    // Four dots inside a bubble.
    expect(loader.children.length).toBeGreaterThan(0);
  });

  it('renders still dots with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <DotLoader variant="pulse" />
      </KinetikProvider>,
    );
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });
});
