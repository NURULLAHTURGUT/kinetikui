import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TwoStepButton } from './two-step-button';

describe('TwoStepButton', () => {
  afterEach(() => jest.useRealTimers());

  it('asks first, then confirms', async () => {
    const onConfirm = jest.fn();
    await render(
      <TwoStepButton confirmLabel="Delete" onConfirm={onConfirm}>
        Delete project
      </TwoStepButton>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete project' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Delete: Delete project' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Back to a single button, ready again.
    expect(screen.getByRole('button', { name: 'Delete project' })).toBeOnTheScreen();
  });

  it('can be cancelled', async () => {
    const onConfirm = jest.fn();
    await render(<TwoStepButton onConfirm={onConfirm}>Archive</TwoStepButton>);
    await fireEvent.press(screen.getByRole('button', { name: 'Archive' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('closes the question after the timeout', async () => {
    jest.useFakeTimers();
    await render(
      <TwoStepButton onConfirm={jest.fn()} timeout={3000}>
        Leave team
      </TwoStepButton>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Leave team' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('does nothing while disabled', async () => {
    await render(
      <TwoStepButton onConfirm={jest.fn()} disabled>
        Delete
      </TwoStepButton>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });
});
