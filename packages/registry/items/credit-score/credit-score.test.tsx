import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CreditScore, scoreBand } from './credit-score';

describe('scoreBand', () => {
  it('names the band for a share of the scale', () => {
    expect(scoreBand(0.2)).toBe('Poor');
    expect(scoreBand(0.5)).toBe('Fair');
    expect(scoreBand(0.7)).toBe('Good');
    expect(scoreBand(0.85)).toBe('Very good');
    expect(scoreBand(0.95)).toBe('Excellent');
  });
});

describe('CreditScore', () => {
  it('reads the score with its band and scale', async () => {
    await render(<CreditScore score={712} />);
    expect(
      screen.getByLabelText('Your credit score is 712, Good, on a scale of 300 to 850'),
    ).toBeOnTheScreen();
  });

  it('shows the empty state below the scale', async () => {
    await render(<CreditScore score={0} emptyHint="Build some history first." />);
    expect(
      screen.getByLabelText('No credit score yet. Build some history first.'),
    ).toBeOnTheScreen();
  });

  it('runs its header action', async () => {
    const onPress = jest.fn();
    await render(<CreditScore score={0} action={{ label: 'Apply', onPress }} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Apply' }));
    });
    expect(onPress).toHaveBeenCalled();
  });
});
