import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RadarChart } from './radar-chart';

export const controls = defineControls({
  season: { type: 'select', label: 'Season', options: ['Summer', 'Winter'], default: 'Summer' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const AXES = ['Distance', 'Climb', 'Views', 'Shade', 'Water', 'Quiet'];

const SEASONS = {
  Summer: {
    ridge: [8, 9, 10, 3, 4, 7],
    lake: [5, 3, 7, 8, 10, 6],
  },
  Winter: {
    ridge: [6, 9, 9, 2, 2, 10],
    lake: [5, 3, 8, 4, 6, 9],
  },
};

export default function RadarChartDemo({ season, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const s = SEASONS[season];
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[4],
          gap: space[2],
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
          Trails
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>{season} scores</Text>
      </View>
      <RadarChart
        accessibilityLabel={`Two trails compared, ${season.toLowerCase()} scores out of 10`}
        axes={AXES}
        max={10}
        size={190}
        haptics={haptics}
        series={[
          { key: 'ridge', label: 'Ridge loop', values: s.ridge },
          { key: 'lake', label: 'Lake path', values: s.lake },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, alignSelf: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
