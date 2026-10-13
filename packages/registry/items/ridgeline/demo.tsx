import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Ridgeline, type RidgeGroup } from './ridgeline';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

// Demo data: a repeatable spread of commute times (minutes) per city.
function samples(centre: number, spread: number, skew: number, seed: number): number[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: 80 }, () => {
    const g = (rand() + rand() + rand() + rand() - 2) * spread;
    return Math.max(5, centre + g + (g > 0 ? g * skew : 0));
  });
}

const GROUPS: RidgeGroup[] = [
  { key: 'lis', label: 'Lisbon', values: samples(28, 9, 0.4, 11) },
  { key: 'ber', label: 'Berlin', values: samples(34, 10, 0.2, 23) },
  { key: 'ist', label: 'Istanbul', values: samples(48, 16, 0.6, 37) },
  { key: 'osl', label: 'Oslo', values: samples(24, 7, 0.3, 41) },
  { key: 'tyo', label: 'Tokyo', values: samples(52, 12, 0.2, 59) },
];

export default function RidgelineDemo({ haptics }: ControlValues<typeof controls>) {
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
      <Ridgeline
        accessibilityLabel="Commute times by city, in minutes"
        groups={GROUPS}
        domain={[0, 100]}
        formatValue={(v) => `${Math.round(v)} min`}
        haptics={haptics}
      />
    </View>
  );
}
