import { fireEvent, render, screen } from '@testing-library/react-native';

import { StepTracker } from './step-tracker';

const STEPS = ['Cart', 'Address', 'Payment', 'Review'];

describe('StepTracker', () => {
  it('reads each step with its place and status', async () => {
    await render(<StepTracker steps={STEPS} current={2} />);
    expect(screen.getByLabelText('Cart, step 1 of 4, done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Payment, step 3 of 4, current step')).toBeOnTheScreen();
    expect(screen.getByLabelText('Review, step 4 of 4, not started')).toBeOnTheScreen();
  });

  it('lets people go back to finished steps only', async () => {
    const onStepPress = jest.fn();
    await render(<StepTracker steps={STEPS} current={2} onStepPress={onStepPress} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Address/ }));
    expect(onStepPress).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('button', { name: /^Review/ })).toBeNull();
  });

  it('marks every step done at the end', async () => {
    await render(<StepTracker steps={STEPS} current={4} />);
    expect(screen.getByLabelText('Review, step 4 of 4, done')).toBeOnTheScreen();
  });
});
