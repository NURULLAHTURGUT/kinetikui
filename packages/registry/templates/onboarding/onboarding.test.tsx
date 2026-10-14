import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Onboarding } from './onboarding';

const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } };

describe('Onboarding', () => {
  it('steps through the slides and finishes on the last one', async () => {
    const onFinish = jest.fn();
    await render(<Onboarding onFinish={onFinish} />);
    await fireEvent(screen.getByTestId('onboarding'), 'layout', layout);
    expect(screen.getByLabelText('Step 1 of 3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Step 2 of 3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('shows Maybe later only with a handler', async () => {
    const onSkip = jest.fn();
    const { rerender } = await render(<Onboarding onFinish={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Maybe later' })).toBeNull();
    await rerender(<Onboarding onFinish={jest.fn()} onSkip={onSkip} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Maybe later' }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('exposes only the current slide', async () => {
    await render(<Onboarding onFinish={jest.fn()} />);
    await fireEvent(screen.getByTestId('onboarding'), 'layout', layout);
    expect(screen.getByText('Welcome')).toBeOnTheScreen();
    expect(screen.queryByText('Easy setup')).toBeNull();
  });
});
