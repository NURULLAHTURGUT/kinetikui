import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StreamGraph, type StreamLayer } from './stream-graph';

export const controls = defineControls({
  range: {
    type: 'select',
    label: 'Range',
    options: ['This year', 'Last year'],
    default: 'This year',
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

// Demo data: hours of listening per month by genre.
const DATA: Record<string, StreamLayer[]> = {
  'This year': [
    { key: 'pop', label: 'Pop', values: [32, 38, 35, 42, 50, 47, 44, 52, 58, 55, 49, 61] },
    { key: 'jazz', label: 'Jazz', values: [12, 14, 18, 16, 13, 11, 10, 14, 19, 24, 28, 30] },
    {
      key: 'electronic',
      label: 'Electronic',
      values: [20, 18, 22, 28, 34, 40, 44, 38, 30, 26, 22, 24],
    },
    { key: 'folk', label: 'Folk', values: [8, 9, 11, 10, 12, 15, 18, 20, 17, 13, 11, 9] },
    { key: 'classical', label: 'Classical', values: [14, 12, 10, 9, 8, 7, 8, 9, 12, 16, 20, 25] },
  ],
  'Last year': [
    { key: 'pop', label: 'Pop', values: [28, 30, 36, 40, 38, 44, 50, 48, 42, 40, 38, 45] },
    { key: 'jazz', label: 'Jazz', values: [18, 20, 17, 14, 12, 10, 9, 11, 14, 16, 20, 22] },
    {
      key: 'electronic',
      label: 'Electronic',
      values: [10, 12, 15, 20, 26, 30, 34, 36, 28, 20, 16, 14],
    },
    { key: 'folk', label: 'Folk', values: [12, 13, 14, 16, 18, 20, 22, 19, 15, 12, 10, 11] },
    {
      key: 'classical',
      label: 'Classical',
      values: [20, 18, 16, 12, 10, 9, 8, 10, 13, 18, 22, 28],
    },
  ],
};

export default function StreamGraphDemo({ range, haptics }: ControlValues<typeof controls>) {
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
      <StreamGraph
        accessibilityLabel={`Hours of listening by genre, ${range.toLowerCase()}`}
        layers={DATA[range]!}
        formatValue={(v) => `${Math.round(v)} h`}
        haptics={haptics}
      />
    </View>
  );
}
