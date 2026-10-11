import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ElasticSlider } from './elastic-slider';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function ElasticSliderDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
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
          leading={<Speaker color={icon} waves={0} />}
          trailing={<Speaker color={icon} waves={2} />}
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
          leading={<Sun color={icon} size={12} />}
          trailing={<Sun color={icon} size={20} />}
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
          leading={
            <Text style={{ color: icon, fontSize: 12, fontWeight: font.weight.semibold }}>A</Text>
          }
          trailing={
            <Text style={{ color: icon, fontSize: 20, fontWeight: font.weight.semibold }}>A</Text>
          }
          haptics={haptics}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

/** A speaker with 0–2 sound waves, drawn from plain views. */
function Speaker({ color, waves }: { color: string; waves: number }) {
  return (
    <View style={styles.speaker}>
      <View style={[styles.speakerBody, { backgroundColor: color }]} />
      <View style={[styles.speakerCone, { borderRightColor: color }]} />
      {[5, 9].slice(0, waves).map((r) => (
        <View
          key={r}
          style={[
            styles.wave,
            {
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              left: 10 - r,
              top: 9 - r,
              borderRightColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** A sun: a disc and eight short rays. */
function Sun({ color, size }: { color: string; size: number }) {
  const disc = size * 0.42;
  const ray = Math.max(2, size * 0.16);
  return (
    <View style={[styles.sun, { width: size, height: size }]}>
      <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: color }} />
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.ray,
            {
              width: 1.75,
              height: ray,
              backgroundColor: color,
              transform: [{ rotate: `${i * 45}deg` }, { translateY: -size / 2 + ray / 2 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  divider: { height: StyleSheet.hairlineWidth },
  speaker: { width: 22, height: 18, flexDirection: 'row', alignItems: 'center' },
  speakerBody: { width: 4, height: 6, borderRadius: 1 },
  speakerCone: {
    width: 0,
    height: 6,
    borderRightWidth: 6,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  wave: {
    position: 'absolute',
    borderWidth: 0,
    borderRightWidth: 1.75,
    borderColor: 'transparent',
  },
  sun: { alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', borderRadius: 1 },
});
