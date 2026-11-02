import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { DualClock, clockText, handAngles } from './dual-clock';

const card = (
  <KinetikProvider reduceMotion="always">
    <DualClock
      zones={[
        { code: 'TYO', offset: 9, face: 'day' },
        { code: 'RIO', offset: -3, face: 'night' },
      ]}
      time={new Date('2026-11-02T12:04:30Z')}
      homeOffset={3}
    />
  </KinetikProvider>
);

describe('DualClock', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('TYO 21:04, RIO 09:04')).toBeOnTheScreen();
  });
});

describe('clock helpers', () => {
  const date = new Date('2026-11-02T03:30:00Z');
  it('finds the hand angles in a zone', () => {
    expect(handAngles(date, 0).minute).toBeCloseTo(180);
    expect(handAngles(date, 0).hour).toBeCloseTo(105);
    expect(handAngles(date, 9).hour).toBeCloseTo(15);
  });
  it('writes the local time and crosses midnight', () => {
    expect(clockText(date, 0)).toBe('03:30');
    expect(clockText(date, -5)).toBe('22:30');
  });
});
