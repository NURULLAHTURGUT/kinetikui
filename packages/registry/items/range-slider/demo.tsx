import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RangeSlider } from './range-slider';

export const controls = defineControls({
  histogram: { type: 'boolean', label: 'Histogram', default: true },
  step: { type: 'select', label: 'Step', options: ['10', '25', '50'], default: '10' },
});

/** Stays per $25 price band, from $0 to $600. */
const BANDS = [2, 4, 7, 12, 18, 26, 31, 38, 35, 30, 27, 22, 19, 16, 14, 11, 9, 8, 6, 5, 4, 3, 3, 2];
const MAX = 600;

export default function RangeSliderDemo({ histogram, step }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [range, setRange] = useState<[number, number]>([120, 380]);
  const count = BANDS.reduce((n, b, i) => {
    const mid = (i + 0.5) * (MAX / BANDS.length);
    return mid >= range[0] && mid <= range[1] ? n + b : n;
  }, 0);

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
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Price range
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Nightly prices before fees
        </Text>
      </View>
      <RangeSlider
        label="Per night"
        value={range}
        onValueChange={setRange}
        min={0}
        max={MAX}
        step={Number(step)}
        minDistance={50}
        formatValue={(v) => (v >= MAX ? `$${v}+` : `$${v}`)}
        histogram={histogram ? BANDS : undefined}
      />
      <View
        style={[
          styles.button,
          { backgroundColor: colors.ember, borderRadius: radius.pill, marginTop: space[1] },
        ]}
      >
        <Text
          style={{
            color: colors.onEmber,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          Show {count} stays
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
