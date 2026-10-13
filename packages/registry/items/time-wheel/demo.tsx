import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TimeWheel, type TimeValue } from './time-wheel';

export const controls = defineControls({
  hourCycle: { type: 'select', label: 'Clock', options: ['24h', '12h'], default: '24h' },
  minuteStep: { type: 'select', label: 'Minute step', options: ['1', '5', '15'], default: '5' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function TimeWheelDemo({
  hourCycle,
  minuteStep,
  haptics,
}: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [time, setTime] = useState<TimeValue>({ hours: 7, minutes: 30 });
  const label =
    hourCycle === '12h'
      ? `${time.hours % 12 || 12}:${String(time.minutes).padStart(2, '0')} ${time.hours >= 12 ? 'PM' : 'AM'}`
      : `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: space[4],
        gap: space[3],
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        Wake me at {label}
      </Text>
      <TimeWheel
        key={`${hourCycle}-${minuteStep}`}
        accessibilityLabel="Alarm"
        value={time}
        onChange={setTime}
        hourCycle={hourCycle}
        minuteStep={Number(minuteStep)}
        haptics={haptics}
      />
    </View>
  );
}
