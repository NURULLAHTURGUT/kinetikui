import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { RollStepper } from './roll-stepper';

function Harness({ initial = 2, max = 4 }: { initial?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <RollStepper
      label="Guests"
      value={value}
      onValueChange={setValue}
      min={1}
      max={max}
      formatValue={(v) => `${v} guests`}
    />
  );
}

describe('RollStepper', () => {
  afterEach(() => jest.useRealTimers());

  it('steps up and down with its buttons', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Increase Guests' }));
    expect(screen.getByRole('adjustable', { name: 'Guests' }).props.accessibilityValue.now).toBe(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Decrease Guests' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Decrease Guests' }));
    expect(screen.getByRole('adjustable').props.accessibilityValue).toMatchObject({
      now: 1,
      text: '1 guests',
    });
  });

  it('stops at its limits', async () => {
    await render(<Harness initial={4} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Increase Guests' }));
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(4);
    expect(screen.getByRole('button', { name: 'Increase Guests' })).toBeDisabled();
  });

  it('responds to screen reader increment and decrement', async () => {
    await render(<Harness />);
    const stepper = screen.getByRole('adjustable');
    await act(async () => {
      fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(3);
  });

  it('keeps stepping while held', async () => {
    jest.useFakeTimers();
    await render(<Harness initial={1} max={20} />);
    const plus = screen.getByRole('button', { name: 'Increase Guests' });
    await fireEvent(plus, 'pressIn');
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    await fireEvent(plus, 'pressOut');
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBeGreaterThan(4);
  });
});
