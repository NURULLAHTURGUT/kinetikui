import { StyleSheet, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StatCard } from './stat-card';

export const controls = defineControls({
  period: { type: 'select', label: 'Period', options: ['Week', 'Month'], default: 'Week' },
});

const PERIODS = {
  Week: {
    visitors: 24_180,
    visitorsDelta: 0.124,
    visits: [12, 15, 13, 18, 17, 21, 19, 24, 22, 27, 25, 31],
    bounce: 38.2,
    bounceDelta: -0.031,
    bounces: [44, 43, 45, 41, 42, 40, 41, 39, 40, 38, 39, 38],
  },
  Month: {
    visitors: 96_412,
    visitorsDelta: -0.042,
    visits: [30, 34, 31, 29, 33, 28, 27, 30, 26, 29, 27, 25],
    bounce: 41.7,
    bounceDelta: 0.018,
    bounces: [39, 40, 39, 41, 40, 42, 41, 40, 42, 41, 43, 42],
  },
};

export default function StatCardDemo({ period }: ControlValues<typeof controls>) {
  const { colors, space } = useKinetikTheme();
  const p = PERIODS[period];
  const caption = `vs last ${period.toLowerCase()}`;

  return (
    <View style={[styles.stack, { gap: space[3] }]}>
      <StatCard
        label="Visitors"
        icon={<DemoIcon name="user" color={colors.textMuted} size={18} />}
        value={p.visitors}
        delta={p.visitorsDelta}
        caption={caption}
        trend={p.visits}
      />
      <StatCard
        label="Bounce rate"
        icon={<DemoIcon name="arrowRight" color={colors.textMuted} size={18} />}
        value={p.bounce}
        formatValue={(v) => `${v.toFixed(1)}%`}
        delta={p.bounceDelta}
        invertDelta
        caption={caption}
        trend={p.bounces}
        color={colors.sky}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', maxWidth: 340, alignSelf: 'center' },
});
