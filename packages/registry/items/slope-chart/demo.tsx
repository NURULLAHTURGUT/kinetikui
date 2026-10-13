import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SlopeChart } from './slope-chart';

export const controls = defineControls({
  height: { type: 'number', label: 'Height', min: 180, max: 320, step: 20, default: 240 },
});

const DATA = {
  trips: {
    title: 'Share of trips',
    from: '2025',
    to: '2026',
    series: [
      { label: 'Lisbon', from: 24, to: 31 },
      { label: 'Kyoto', from: 30, to: 22 },
      { label: 'Reykjavík', from: 9, to: 16 },
      { label: 'Oslo', from: 14, to: 12 },
      { label: 'Lima', from: 6, to: 11 },
    ],
  },
  rating: {
    title: 'Average rating × 10',
    from: 'Spring',
    to: 'Autumn',
    series: [
      { label: 'Lisbon', from: 44, to: 46 },
      { label: 'Kyoto', from: 47, to: 48 },
      { label: 'Reykjavík', from: 41, to: 45 },
      { label: 'Oslo', from: 45, to: 43 },
      { label: 'Lima', from: 40, to: 42 },
    ],
  },
} as const;

export default function SlopeChartDemo({ height }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [set, setSet] = useState<keyof typeof DATA>('trips');
  const data = DATA[set];

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
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {data.title}
        </Text>
        <View
          style={[
            styles.switch,
            { backgroundColor: colors.surfaceSunken, borderRadius: radius.pill },
          ]}
        >
          {(Object.keys(DATA) as (keyof typeof DATA)[]).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: set === k }}
              onPress={() => setSet(k)}
              style={[
                styles.option,
                {
                  borderRadius: radius.pill,
                  backgroundColor: set === k ? colors.surfaceRaised : undefined,
                },
              ]}
            >
              <Text
                style={{
                  color: set === k ? colors.text : colors.textMuted,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.semibold,
                }}
              >
                {k === 'trips' ? 'Trips' : 'Rating'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <SlopeChart
        accessibilityLabel={data.title}
        fromLabel={data.from}
        toLabel={data.to}
        series={data.series}
        formatValue={set === 'trips' ? (v) => `${Math.round(v)}%` : (v) => (v / 10).toFixed(1)}
        height={height}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        Tap a city to bring its line forward.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switch: { flexDirection: 'row', padding: 3 },
  option: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
});
