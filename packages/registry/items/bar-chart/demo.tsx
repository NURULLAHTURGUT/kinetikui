import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BarChart } from './bar-chart';

export const controls = defineControls({
  range: { type: 'select', label: 'Range', options: ['Week', 'Year'], default: 'Week' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const WEEK = [
  { label: 'M', value: 6420 },
  { label: 'T', value: 8930 },
  { label: 'W', value: 7310 },
  { label: 'T', value: 11240 },
  { label: 'F', value: 9050 },
  { label: 'S', value: 13680 },
  { label: 'S', value: 4870 },
];
const YEAR = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => ({
  label,
  value: Math.round(7200 + Math.sin(i / 1.7) * 1900 + i * 160),
}));

const steps = (v: number) => v.toLocaleString('en-US');

export default function BarChartDemo({ range, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const data = range === 'Week' ? WEEK : YEAR;
  const [focus, setFocus] = useState<number | null>(null);
  const average = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);
  const shown = focus === null ? average : (data[focus]?.value ?? average);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[5],
        },
      ]}
    >
      <View style={{ gap: space[1] }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {focus === null
            ? range === 'Week'
              ? 'Daily average'
              : 'Monthly daily average'
            : 'Steps'}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.bold,
            letterSpacing: -1,
            fontVariant: ['tabular-nums'],
          }}
        >
          {steps(shown)}
        </Text>
      </View>
      <BarChart
        key={range}
        accessibilityLabel={range === 'Week' ? 'Steps this week' : 'Average steps per month'}
        data={data}
        max={14000}
        height={150}
        haptics={haptics}
        formatValue={steps}
        onSelect={setFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
