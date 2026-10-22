import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { MonthCalendar, monthGrid, type DateRange } from './month-calendar';

describe('monthGrid', () => {
  it('shows six weeks starting on the chosen weekday', () => {
    // October 2026 starts on a Thursday.
    const monday = monthGrid(new Date(2026, 9, 13), 1);
    expect(monday).toHaveLength(42);
    expect(monday[0]!.toDateString()).toBe(new Date(2026, 8, 28).toDateString());
    expect(monday[3]!.getDate()).toBe(1);
    const sunday = monthGrid(new Date(2026, 9, 13), 0);
    expect(sunday[4]!.getDate()).toBe(1);
  });
});

function Single({ onChange }: { onChange?: jest.Mock }) {
  const [value, setValue] = useState<Date | null>(new Date(2026, 9, 13));
  return (
    <MonthCalendar
      value={value}
      onChange={(d) => {
        setValue(d);
        onChange?.(d);
      }}
      maxDate={new Date(2026, 9, 28)}
    />
  );
}

function Range({ onChange }: { onChange: jest.Mock }) {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  return (
    <MonthCalendar
      mode="range"
      initialMonth={new Date(2026, 9, 1)}
      range={range}
      onRangeChange={(r) => {
        setRange(r);
        onChange(r);
      }}
    />
  );
}

describe('MonthCalendar', () => {
  it('names the month and every day, with the selected day marked', async () => {
    await render(<Single />);
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Tuesday, October 13, 2026$/ })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('picks a day and refuses days past the maximum', async () => {
    const onChange = jest.fn();
    await render(<Single onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: /Thursday, October 22, 2026$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].getDate()).toBe(22);
    await fireEvent.press(screen.getByRole('button', { name: /Friday, October 30, 2026$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('turns the page with the arrows', async () => {
    await render(<Single />);
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('header', { name: 'November 2026' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('header', { name: 'September 2026' })).toBeOnTheScreen();
  });

  it('builds a range from two taps and restarts it on the third', async () => {
    const onChange = jest.fn();
    await render(<Range onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: /Monday, October 5, 2026$/ }));
    await fireEvent.press(screen.getByRole('button', { name: /Friday, October 9, 2026$/ }));
    const last = onChange.mock.calls[1][0] as DateRange;
    expect([last.start?.getDate(), last.end?.getDate()]).toEqual([5, 9]);
    await fireEvent.press(screen.getByRole('button', { name: /Thursday, October 1, 2026$/ }));
    const next = onChange.mock.calls[2][0] as DateRange;
    expect([next.start?.getDate(), next.end]).toEqual([1, null]);
  });
});
