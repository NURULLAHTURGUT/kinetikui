import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { TimeWheel, type TimeValue } from './time-wheel';

function Harness({ hourCycle, onChange }: { hourCycle?: '12h' | '24h'; onChange?: jest.Mock }) {
  const [value, setValue] = useState<TimeValue>({ hours: 9, minutes: 30 });
  return (
    <TimeWheel
      testID="wheel"
      accessibilityLabel="Alarm"
      value={value}
      minuteStep={5}
      hourCycle={hourCycle}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const act11y = async (name: string, actionName: 'increment' | 'decrement') => {
  await act(async () => {
    fireEvent(screen.getByRole('adjustable', { name }), 'accessibilityAction', {
      nativeEvent: { actionName },
    });
  });
};

describe('TimeWheel', () => {
  it('reads each wheel as an adjustable with its value', async () => {
    await render(<Harness />);
    expect(screen.getByRole('adjustable', { name: 'Alarm, hours' })).toHaveProp(
      'accessibilityValue',
      { text: '09' },
    );
    expect(screen.getByRole('adjustable', { name: 'Alarm, minutes' })).toHaveProp(
      'accessibilityValue',
      { text: '30' },
    );
  });

  it('steps hours and minutes with screen reader actions', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act11y('Alarm, hours', 'increment');
    expect(onChange).toHaveBeenLastCalledWith({ hours: 10, minutes: 30 });
    await act11y('Alarm, minutes', 'decrement');
    expect(onChange).toHaveBeenLastCalledWith({ hours: 10, minutes: 25 });
  });

  it('settles on the row a scroll comes to rest on', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent(screen.getByTestId('wheel-minutes'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: 40 * 9 } },
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onChange).toHaveBeenLastCalledWith({ hours: 9, minutes: 45 });
  });

  it('adds an AM/PM wheel for a 12-hour clock', async () => {
    const onChange = jest.fn();
    await render(<Harness hourCycle="12h" onChange={onChange} />);
    expect(screen.getByRole('adjustable', { name: 'Alarm, hours' })).toHaveProp(
      'accessibilityValue',
      { text: '9' },
    );
    await act11y('Alarm, AM or PM', 'increment');
    expect(onChange).toHaveBeenLastCalledWith({ hours: 21, minutes: 30 });
  });
});
