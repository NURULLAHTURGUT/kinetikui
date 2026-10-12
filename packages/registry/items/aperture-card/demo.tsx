import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { ApertureCard } from './aperture-card';

export const controls = defineControls({
  blades: { type: 'number', label: 'Blades', min: 5, max: 9, step: 1, default: 7 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function ApertureCardDemo({ blades, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <ApertureCard
      blades={blades}
      haptics={haptics}
      accessibilityLabel="Mystery reward"
      style={{ height: 300 }}
      cover={
        <View style={[styles.coverRow, { padding: space[5] }]}>
          <Text style={[styles.overline, { color: colors.textMuted }]}>MYSTERY REWARD</Text>
          <View
            style={[
              styles.hint,
              {
                borderRadius: radius.pill,
                backgroundColor: withAlpha(colors.background, 0.55),
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.overline, { color: colors.text }]}>TAP TO OPEN</Text>
          </View>
        </View>
      }
    >
      <View style={[styles.reward, { backgroundColor: colors.surface, gap: space[2] }]}>
        <View style={[styles.glow, { boxShadow: `0px 0px 120px 60px ${colors.emberSoft}` }]} />
        <Text style={[styles.overline, { color: colors.textMuted }]}>YOU UNLOCKED</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.heavy,
            letterSpacing: -1.2,
          }}
        >
          Night Mode Pro
        </Text>
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.ember, borderRadius: radius.pill, marginTop: space[2] },
          ]}
        >
          <Text
            style={{ color: colors.onEmber, fontSize: font.size.sm, fontWeight: font.weight.bold }}
          >
            30 days free
          </Text>
        </View>
      </View>
    </ApertureCard>
  );
}

const styles = StyleSheet.create({
  coverRow: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reward: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 1, height: 1, top: '50%', left: '50%' },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7 },
});
