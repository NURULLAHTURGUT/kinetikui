import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ElasticSlider } from './elastic-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function ElasticSliderDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, space, radius } = useKinetikTheme();
  const [volume, setVolume] = useState(64);
  const [brightness, setBrightness] = useState(0.7);
  const [textSize, setTextSize] = useState(3);
  const icon = colors.text;

  return (
    <View style={{ gap: space[2] }}>
      <Text style={[styles.section, { color: colors.textSubtle, marginLeft: space[4] }]}>
        SOUND & DISPLAY
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          paddingHorizontal: space[4],
          paddingVertical: space[4],
          gap: space[5],
        }}
      >
        <ElasticSlider
          label="Volume"
          value={volume}
          onValueChange={setVolume}
          min={0}
          max={100}
          step={1}
          formatValue={(v) => `${Math.round(v)}%`}
          leading={<DemoIcon name="volumeLow" color={icon} size={20} />}
          trailing={<DemoIcon name="volumeHigh" color={icon} size={22} />}
          haptics={haptics}
          disabled={disabled}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ElasticSlider
          label="Brightness"
          value={brightness}
          onValueChange={setBrightness}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          leading={<DemoIcon name="sunLow" color={icon} size={18} />}
          trailing={<DemoIcon name="sunHigh" color={icon} size={22} />}
          haptics={haptics}
          disabled={disabled}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ElasticSlider
          label="Text size"
          value={textSize}
          onValueChange={setTextSize}
          min={1}
          max={7}
          step={1}
          formatValue={(v) => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'][v - 1] ?? String(v)}
          leading={<DemoIcon name="textSize" color={icon} size={16} />}
          trailing={<DemoIcon name="textSize" color={icon} size={22} />}
          haptics={haptics}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  divider: { height: StyleSheet.hairlineWidth },
});
