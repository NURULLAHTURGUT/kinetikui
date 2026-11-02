import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { CruiseDial, segmentPath } from './cruise-dial';

const dial = (speed = 842) => (
  <KinetikProvider reduceMotion="always">
    <CruiseDial speed={speed} tag="KN204" label="CEILING:" reading="11,234 M" />
  </KinetikProvider>
);

describe('segmentPath', () => {
  const bars = (d: string) => d.split('M').length - 1;

  it('lights the right number of segments', () => {
    expect(bars(segmentPath('1'))).toBe(2);
    expect(bars(segmentPath('8'))).toBe(7);
    expect(bars(segmentPath('18'))).toBe(9);
  });

  it('moves each digit along', () => {
    expect(segmentPath('11')).toContain('M23 1.5');
  });
});

describe('CruiseDial', () => {
  it('reads as one label', async () => {
    await render(dial());
    expect(screen.getByLabelText('KN204. CEILING: 11,234 M. 842 /KMH')).toBeOnTheScreen();
  });

  it('clamps the speed to the dial', async () => {
    await render(dial(5000));
    expect(screen.getByLabelText('KN204. CEILING: 11,234 M. 900 /KMH')).toBeOnTheScreen();
  });

  it('draws the dial with its marks once measured', async () => {
    await render(dial());
    await fireEvent(screen.getByLabelText(/^KN204/), 'layout', {
      nativeEvent: { layout: { width: 240, height: 240 } },
    });
    expect(
      screen.getByTestId('cruise-dial-scale', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    for (const mark of ['0', '500', '900']) {
      expect(screen.getByText(mark, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });
});
