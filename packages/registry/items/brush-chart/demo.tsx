import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BrushChart } from './brush-chart';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

// Demo data: 180 days of visitors with a weekly rhythm and a slow climb.
const DAYS = 180;
const START = new Date(2026, 3, 1);
const DATA = Array.from({ length: DAYS }, (_, i) => {
  const week = Math.sin((i / 7) * Math.PI * 2) * 140;
  const trend = 1200 + i * 9;
  const wobble = Math.sin(i * 1.7) * 90 + Math.cos(i * 0.37) * 160;
  return Math.round(trend + week + wobble);
});
const LABELS = DATA.map((_, i) => {
  const d = new Date(START.getFullYear(), START.getMonth(), START.getDate() + i);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
});

export default function BrushChartDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, radius, space } = useKinetikTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space[4],
      }}
    >
      <BrushChart
        accessibilityLabel="Daily visitors"
        data={DATA}
        labels={LABELS}
        initialWindow={[0.7, 1]}
        formatValue={(v) => v.toLocaleString('en-US')}
        haptics={haptics}
      />
    </View>
  );
}
