import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { DonutChart } from './donut-chart';

export const controls = defineControls({
  thickness: { type: 'number', label: 'Thickness', min: 8, max: 30, step: 2, default: 18 },
  gap: { type: 'number', label: 'Gap (°)', min: 0, max: 14, step: 1, default: 6 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const SPENDING = [
  { label: 'Rent', value: 1240 },
  { label: 'Groceries', value: 420 },
  { label: 'Dining out', value: 210 },
  { label: 'Transport', value: 160 },
  { label: 'Other', value: 95 },
];

const dollars = (v: number) => `$${v.toLocaleString('en-US')}`;

export default function DonutChartDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
          October
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>Spending</Text>
      </View>
      <DonutChart
        {...props}
        accessibilityLabel="Spending in October by category"
        data={SPENDING}
        size={190}
        formatValue={dollars}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
