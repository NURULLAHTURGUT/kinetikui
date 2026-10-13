import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { UsageMeter } from './usage-meter';

export const controls = defineControls({
  total: { type: 'select', label: 'Plan', options: ['128', '256', '512'], default: '256' },
  legend: { type: 'boolean', label: 'Legend', default: true },
});

const BASE = [
  { label: 'Photos', value: 92 },
  { label: 'Video', value: 48 },
  { label: 'Apps', value: 21 },
  { label: 'Other', value: 9 },
];

export default function UsageMeterDemo({ total, legend }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [extra, setExtra] = useState(0);
  const segments = BASE.map((s) => (s.label === 'Video' ? { ...s, value: s.value + extra } : s));

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
      <UsageMeter
        title="iCloud storage"
        unit="GB"
        total={Number(total)}
        segments={segments}
        legend={legend}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExtra((e) => e + 40)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.azureSoft,
              borderRadius: radius.pill,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.azure,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            Record 40 GB of video
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExtra(0)}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            Clear
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    minHeight: minTouchTarget,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
