import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { Skeleton, SkeletonGroup } from './skeleton-sweep';

describe('Skeleton Sweep', () => {
  it('announces the group as a busy progress bar', async () => {
    await render(
      <SkeletonGroup accessibilityLabel="Loading messages">
        <Skeleton />
        <Skeleton circle={40} />
      </SkeletonGroup>,
    );
    const group = screen.getByRole('progressbar', { name: 'Loading messages' });
    expect(group).toBeBusy();
  });

  it('sizes circles and blocks', async () => {
    const { toJSON } = await render(
      <SkeletonGroup>
        <Skeleton circle={40} />
        <Skeleton width={120} height={10} radius={4} />
      </SkeletonGroup>,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"width":40');
    expect(json).toContain('"borderRadius":20');
    expect(json).toContain('"width":120');
  });

  it('renders the sweep band only while animating', async () => {
    const band = (json: string) => (json.match(/linear-gradient/g) ?? []).length;
    const { toJSON, rerender } = await render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(band(JSON.stringify(toJSON()))).toBeGreaterThan(0);

    await rerender(
      <SkeletonGroup active={false}>
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(band(JSON.stringify(toJSON()))).toBe(0);

    await rerender(
      <KinetikProvider reduceMotion="always">
        <SkeletonGroup>
          <Skeleton />
        </SkeletonGroup>
      </KinetikProvider>,
    );
    expect(band(JSON.stringify(toJSON()))).toBe(0);
  });

  it('works on its own outside a group', async () => {
    const { toJSON } = await render(<Skeleton width={80} />);
    expect(JSON.stringify(toJSON())).toContain('linear-gradient');
  });
});
