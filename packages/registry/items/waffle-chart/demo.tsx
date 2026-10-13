import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { WaffleChart } from './waffle-chart';

export const controls = defineControls({
  legend: { type: 'boolean', label: 'Legend', default: true },
});

const TRIPS = {
  Lisbon: [
    { label: 'Stays', value: 46 },
    { label: 'Flights', value: 28 },
    { label: 'Food', value: 17 },
    { label: 'Tours', value: 6 },
  ],
  Kyoto: [
    { label: 'Stays', value: 34 },
    { label: 'Flights', value: 41 },
    { label: 'Food', value: 14 },
    { label: 'Tours', value: 9 },
  ],
} as const;

export default function WaffleChartDemo({ legend }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [trip, setTrip] = useState<keyof typeof TRIPS>('Lisbon');
  const data = TRIPS[trip];
  const spent = data.reduce((a, b) => a + b.value, 0);

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
      <View style={styles.top}>
        <View style={{ gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
          >
            Trip budget
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            {spent}% spent · each square is 1%
          </Text>
        </View>
        <View
          style={[
            styles.switch,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill },
          ]}
        >
          {(Object.keys(TRIPS) as (keyof typeof TRIPS)[]).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: trip === k }}
              onPress={() => setTrip(k)}
              style={[
                styles.option,
                {
                  borderRadius: radius.pill,
                  backgroundColor: trip === k ? colors.surfaceRaised : undefined,
                },
              ]}
            >
              <Text
                style={{
                  color: trip === k ? colors.text : colors.textMuted,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.semibold,
                }}
              >
                {k}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <WaffleChart accessibilityLabel={`${trip} trip budget`} data={data} legend={legend} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  switch: { flexDirection: 'row', padding: 3 },
  option: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
});
