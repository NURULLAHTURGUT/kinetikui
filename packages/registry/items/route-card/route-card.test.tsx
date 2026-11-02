import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { RouteCard } from './route-card';

const from = { code: 'IST', city: 'ISTANBUL', time: '09:40AM' };
const to = { code: 'NRT', city: 'TOKYO', time: '03:25PM' };

describe('RouteCard', () => {
  it('reads the route and progress as one progress bar', async () => {
    await render(
      <RouteCard from={from} to={to} progress={0.58} status="ON SCHEDULE" tag="KN204" />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibleName(
      'IST, ISTANBUL, to NRT, TOKYO. BOARDS: 09:40AM, LANDS: 03:25PM. ON SCHEDULE. KN204.',
    );
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 58, text: '58% of the way' });
  });

  it('clamps progress and takes custom labels', async () => {
    await render(
      <RouteCard from={from} to={to} progress={1.4} departLabel="Left" arriveLabel="Due" />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibilityValue({ now: 100 });
    expect(bar).toHaveAccessibleName('IST, ISTANBUL, to NRT, TOKYO. Left 09:40AM, Due 03:25PM.');
  });

  it('draws the globe once measured, with reduced motion too, and takes a custom mark', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <RouteCard from={from} to={to} progress={0.2} mark={<Text>Logo</Text>} />
      </KinetikProvider>,
    );
    await fireEvent(screen.getByRole('progressbar'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 190 } },
    });
    expect(screen.getByText('Logo', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
