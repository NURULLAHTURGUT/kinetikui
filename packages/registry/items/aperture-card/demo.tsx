import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
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
        <View style={{ alignItems: 'center', gap: space[2] }}>
          <View style={[styles.lens, { borderColor: colors.borderStrong }]} />
          <Text style={[styles.overline, { color: colors.textMuted }]}>TAP TO OPEN</Text>
        </View>
      }
    >
      <View
        style={[
          styles.reward,
          gradient(`linear-gradient(140deg, ${colors.ember} 0%, ${colors.surfaceSunken} 85%)`),
        ]}
      >
        <Text style={[styles.overline, { color: colors.onEmber }]}>YOU UNLOCKED</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.heavy,
            letterSpacing: -1,
          }}
        >
          Night Mode Pro
        </Text>
        <View style={[styles.pill, { backgroundColor: colors.surface, borderRadius: radius.pill }]}>
          <Text style={{ color: colors.text, fontWeight: font.weight.semibold }}>30 days free</Text>
        </View>
      </View>
    </ApertureCard>
  );
}

const styles = StyleSheet.create({
  reward: { flex: 1, padding: 24, justifyContent: 'flex-end', gap: 8 },
  lens: { width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
});
