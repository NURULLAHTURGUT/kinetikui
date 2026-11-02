import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { LevelSteps, stairPosition } from './level-steps';

const card = (
  <KinetikProvider reduceMotion="always">
    <LevelSteps value={47.8} label="AEROBIC SCORE" rating="STRONG" stops={[15, 25, 34, 44, 53]} />
  </KinetikProvider>
);

describe('LevelSteps', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('AEROBIC SCORE 47.8, STRONG')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('level-steps-chart', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('AEROBIC SCORE 47.8, STRONG')).toBeOnTheScreen();
  });
});

describe('stairPosition', () => {
  const stops = [10, 20, 30, 40];
  it('places a value within its step', () => {
    expect(stairPosition(25, stops)).toBeCloseTo(0.375);
  });
  it('clamps to the ends', () => {
    expect(stairPosition(2, stops)).toBe(0);
    expect(stairPosition(99, stops)).toBe(1);
  });
});
