import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { LineChart } from './line-chart';

export const controls = defineControls({
  range: { type: 'select', label: 'Range', options: ['6M', '1Y'], default: '1Y' },
  area: { type: 'boolean', label: 'Area', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const REVENUE = [18.2, 21.4, 19.8, 24.6, 23.1, 27.9, 26.4, 31.2, 29.8, 34.6, 33.1, 38.4];

const money = (v: number) => `$${v.toFixed(1)}k`;

export default function LineChartDemo({ range, area, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const take = range === '6M' ? 6 : 12;
  const data = REVENUE.slice(-take);
  const labels = MONTHS.slice(-take);
  const [focus, setFocus] = useState<number | null>(null);
  const i = focus ?? data.length - 1;
  const change = ((data[i]! - data[0]!) / data[0]!) * 100;

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
      <View style={{ gap: space[1] }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Revenue · {focus === null ? 'this month' : labels[i]}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size['3xl'],
              fontWeight: font.weight.bold,
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}
          >
            {money(data[i]!)}
          </Text>
          <View
            style={[styles.delta, { backgroundColor: colors.emberSoft, borderRadius: radius.pill }]}
          >
            <Text
              style={{
                color: change >= 0 ? colors.success : colors.danger,
                fontSize: font.size.xs,
                fontWeight: font.weight.bold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
      <LineChart
        accessibilityLabel={`Revenue, last ${take} months`}
        data={data}
        labels={labels}
        area={area}
        haptics={haptics}
        formatValue={money}
        onScrub={setFocus}
        height={190}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  delta: { paddingHorizontal: 8, paddingVertical: 4 },
});
