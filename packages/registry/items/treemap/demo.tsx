import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Treemap, type TreemapNode } from './treemap';

export const controls = defineControls({
  height: { type: 'number', label: 'Height', min: 220, max: 360, step: 20, default: 300 },
});

const SPENDING: TreemapNode[] = [
  {
    key: 'stays',
    label: 'Stays',
    children: [
      { key: 'lisbon', label: 'Lisbon flat', value: 920 },
      { key: 'cabin', label: 'Lake cabin', value: 640 },
      { key: 'hostel', label: 'Porto hostel', value: 210 },
    ],
  },
  {
    key: 'travel',
    label: 'Travel',
    children: [
      { key: 'flights', label: 'Flights', value: 780 },
      { key: 'trains', label: 'Trains', value: 260 },
      { key: 'car', label: 'Car hire', value: 340 },
      { key: 'taxis', label: 'Taxis', value: 90 },
    ],
  },
  {
    key: 'food',
    label: 'Food',
    children: [
      { key: 'restaurants', label: 'Restaurants', value: 510 },
      { key: 'markets', label: 'Markets', value: 220 },
      { key: 'coffee', label: 'Coffee', value: 85 },
    ],
  },
  { key: 'tours', label: 'Tours', value: 380 },
  { key: 'other', label: 'Other', value: 150 },
];

export default function TreemapDemo({ height }: ControlValues<typeof controls>) {
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
          gap: space[3],
        },
      ]}
    >
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Summer trip spending
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Tap a group to look inside it.
        </Text>
      </View>
      <Treemap
        accessibilityLabel="Summer trip spending"
        rootLabel="All spending"
        data={SPENDING}
        height={height}
        formatValue={(v) => `€${Math.round(v).toLocaleString('en-US')}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
