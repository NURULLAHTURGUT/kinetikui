import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { AuroraVeil } from './aurora-veil';

export const controls = defineControls({
  intensity: { type: 'number', label: 'Intensity', min: 0, max: 1, step: 0.05, default: 0.85 },
  speed: { type: 'number', label: 'Speed', min: 0.2, max: 3, step: 0.1, default: 1 },
  frameRate: { type: 'select', label: 'Frame rate', options: ['60', '30'], default: '60' },
  reduceEffects: { type: 'boolean', label: 'Still frame', default: false },
});

export default function AuroraVeilDemo({ frameRate, ...props }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <AuroraVeil
      {...props}
      frameRate={frameRate === '30' ? 30 : 60}
      style={[styles.hero, { borderRadius: radius.xl }]}
    >
      <View style={{ padding: space[6], gap: space[2] }}>
        <Text style={[styles.overline, { color: colors.textMuted }]}>NORTHERN LIGHTS</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.heavy,
            letterSpacing: -1,
            lineHeight: 38,
          }}
        >
          Quiet motion{'\n'}behind loud ideas.
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          One fragment shader, drawn on the GPU.
        </Text>
      </View>
    </AuroraVeil>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, justifyContent: 'flex-end' },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
});
