import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { SeatPicker, type SeatPickerProps } from './seat-picker';

function Harness(props: Partial<SeatPickerProps>) {
  const [value, setValue] = useState(props.value ?? 1);
  return (
    <SeatPicker
      max={5}
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
    />
  );
}

const press = (name: string) =>
  act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });

describe('SeatPicker', () => {
  it('counts seats and the ones left', async () => {
    await render(<Harness />);
    expect(screen.getByRole('adjustable', { name: 'Seats' })).toHaveAccessibilityValue({
      now: 1,
      text: '1 seat',
    });
    expect(screen.getByLabelText('4 seats left')).toBeOnTheScreen();
    await press('Add a seat');
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 2, text: '2 seats' });
    expect(screen.getByLabelText('3 seats left')).toBeOnTheScreen();
  });

  it('stops at the limits without calling onChange', async () => {
    const onChange = jest.fn();
    await render(<Harness value={1} max={2} onChange={onChange} />);
    await press('Remove a seat');
    expect(onChange).not.toHaveBeenCalled();
    await press('Add a seat');
    await press('Add a seat');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('No seats left')).toBeOnTheScreen();
    expect(screen.getByText('Full')).toBeOnTheScreen();
  });

  it('steps with screen-reader actions', async () => {
    await render(<Harness value={3} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 2 });
  });

  it('shows the caption, action and info button when given', async () => {
    const onPress = jest.fn();
    const onInfo = jest.fn();
    await render(
      <Harness caption="Add seats later." action={{ label: 'Upgrade', onPress }} onInfo={onInfo} />,
    );
    expect(screen.getByText('Add seats later.')).toBeOnTheScreen();
    await press('Upgrade');
    await press('About seats');
    expect(onPress).toHaveBeenCalled();
    expect(onInfo).toHaveBeenCalled();
  });
});
