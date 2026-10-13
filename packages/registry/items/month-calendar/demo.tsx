import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MonthCalendar, type DateRange } from './month-calendar';

export const controls = defineControls({
  mode: { type: 'select', label: 'Mode', options: ['single', 'range'], default: 'single' },
  weekStartsOn: {
    type: 'select',
    label: 'Week starts',
    options: ['Monday', 'Sunday'],
    default: 'Monday',
  },
});

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…';

export default function MonthCalendarDemo({ mode, weekStartsOn }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const today = new Date();
  const [date, setDate] = useState<Date | null>(today);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const marked = [3, 9, 17, 24].map((d) => new Date(today.getFullYear(), today.getMonth(), d));
  const start = weekStartsOn === 'Monday' ? 1 : 0;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: space[3],
        gap: space[2],
      }}
    >
      {mode === 'range' ? (
        <MonthCalendar
          mode="range"
          range={range}
          onRangeChange={setRange}
          weekStartsOn={start}
          minDate={today}
        />
      ) : (
        <MonthCalendar value={date} onChange={setDate} marked={marked} weekStartsOn={start} />
      )}
      <Text
        style={{
          color: colors.textMuted,
          fontSize: font.size.sm,
          textAlign: 'center',
          paddingBottom: space[1],
        }}
      >
        {mode === 'range' ? `${fmt(range.start)} – ${fmt(range.end)}` : `Selected ${fmt(date)}`}
      </Text>
    </View>
  );
}
