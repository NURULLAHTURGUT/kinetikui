import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { isLight, SwatchPicker } from './swatch-picker';

export const controls = defineControls({
  size: { type: 'number', label: 'Swatch size', min: 24, max: 40, step: 2, default: 32 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

// Demo data: a muted, print-like set of accents.
const SWATCHES = [
  { value: '#2B6BEF', label: 'Cobalt' },
  { value: '#3BA58B', label: 'Sea glass' },
  { value: '#8FB339', label: 'Moss' },
  { value: '#F2C14E', label: 'Butter' },
  { value: '#F08A4B', label: 'Apricot' },
  { value: '#E5566D', label: 'Coral' },
  { value: '#9B6BDF', label: 'Lilac' },
  { value: '#EDEDED', label: 'Chalk' },
  { value: '#2B2B2B', label: 'Graphite' },
];

export default function SwatchPickerDemo({ size, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [accent, setAccent] = useState('#3BA58B');
  const name = SWATCHES.find((s) => s.value === accent)?.label;

  return (
    <View style={{ gap: space[4] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          padding: space[4],
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
          >
            Studio North
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>Preview</Text>
        </View>
        <View
          style={{
            paddingHorizontal: space[4],
            paddingVertical: space[2],
            borderRadius: radius.pill,
            backgroundColor: accent,
          }}
        >
          <Text
            style={{
              color: isLight(accent) ? '#111111' : '#FFFFFF',
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            Follow
          </Text>
        </View>
      </View>
      <View style={{ gap: space[2] }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          Accent colour · {name}
        </Text>
        <SwatchPicker
          accessibilityLabel="Accent colour"
          swatches={SWATCHES}
          value={accent}
          onValueChange={setAccent}
          size={size}
          haptics={haptics}
        />
      </View>
    </View>
  );
}
