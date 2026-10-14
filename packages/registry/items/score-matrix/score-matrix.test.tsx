import { render, screen } from '@testing-library/react-native';

import { ScoreMatrix } from './score-matrix';

const METRICS = [
  { label: 'Sleep', value: 88, tone: 'hsl(18, 80%, 52%)' },
  { label: 'Strength', value: 170, unit: 'lbs', tone: 'hsl(75, 30%, 45%)' },
];

describe('ScoreMatrix', () => {
  it('reads the score against its scale', async () => {
    await render(<ScoreMatrix label="Athletic score" score={13} metrics={METRICS} />);
    expect(screen.getByLabelText('Athletic score: 13 out of 100')).toBeOnTheScreen();
  });

  it('reads each metric with its unit', async () => {
    await render(<ScoreMatrix label="Score" score={40} max={50} metrics={METRICS} />);
    expect(screen.getByLabelText('Score: 40 out of 50')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sleep: 88')).toBeOnTheScreen();
    expect(screen.getByLabelText('Strength: 170 lbs')).toBeOnTheScreen();
  });
});
