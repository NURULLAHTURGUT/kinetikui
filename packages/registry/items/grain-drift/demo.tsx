import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { GrainDrift } from './grain-drift';

export const controls = defineControls({
  grain: { type: 'number', label: 'Grain', min: 0, max: 1, step: 0.05, default: 0.5 },
  speed: { type: 'number', label: 'Speed', min: 0.2, max: 3, step: 0.1, default: 1 },
  reduceEffects: { type: 'boolean', label: 'Still frame', default: false },
});

export default function GrainDriftDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <GrainDrift {...props} style={[styles.card, { borderRadius: radius.xl }]}>
      <View style={{ padding: space[6], gap: space[3] }}>
        <View
          style={[
            styles.badge,
            { backgroundColor: withAlpha(colors.background, 0.55), borderRadius: radius.pill },
          ]}
        >
          <Text
            style={{ color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.bold }}
          >
            NOW PLAYING
          </Text>
        </View>
        <Text
          style={{ color: colors.text, fontSize: font.size['2xl'], fontWeight: font.weight.heavy }}
        >
          Afterglow Sessions
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Mesh gradient · film grain · GPU
        </Text>
      </View>
    </GrainDrift>
  );
}

const styles = StyleSheet.create({
  card: { height: 320, justifyContent: 'flex-end' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 },
});
