import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { GlintCard } from './glint-card';

export const controls = defineControls({
  source: {
    type: 'select',
    label: 'Light source',
    options: ['both', 'touch', 'tilt'],
    default: 'both',
  },
  intensity: { type: 'number', label: 'Intensity', min: 0, max: 1, step: 0.05, default: 0.7 },
  tiltDegrees: { type: 'number', label: 'Card tilt (°)', min: 0, max: 10, step: 1, default: 4 },
  reduceEffects: { type: 'boolean', label: 'Reduce effects', default: false },
});

export default function GlintCardDemo(props: ControlValues<typeof controls>) {
  const theme = useKinetikTheme();
  const { colors, space, font, radius } = theme;

  return (
    <View style={{ gap: space[5] }}>
      <GlintCard
        {...props}
        accessibilityRole="summary"
        accessibilityLabel="Night Pass, gate 4, seat 12A"
        style={{ backgroundColor: theme.scheme === 'dark' ? '#1A1210' : '#2A1A14' }}
        contentStyle={{ padding: space[6], gap: space[8] }}
      >
        <View style={styles.row}>
          <View
            style={[styles.emblem, { borderRadius: radius.pill, backgroundColor: colors.ember }]}
          >
            <View style={[styles.emblemCore, { backgroundColor: '#1A1210' }]} />
          </View>
          <Text
            style={[styles.overline, { color: withAlpha('#FFFFFF', 0.6), fontSize: font.size.xs }]}
          >
            NIGHT PASS
          </Text>
        </View>
        <View style={{ gap: space[1] }}>
          <Text style={[styles.display, { color: '#FFF4EE', fontSize: font.size['3xl'] }]}>
            Kinetik
          </Text>
          <Text style={{ color: withAlpha('#FFFFFF', 0.62), fontSize: font.size.sm }}>
            Tilt the device or drag a finger across the card.
          </Text>
        </View>
        <View style={styles.row}>
          <Meta label="Gate" value="04" />
          <Meta label="Seat" value="12A" />
          <Meta label="Boards" value="21:40" />
        </View>
      </GlintCard>

      <GlintCard {...props} intensity={props.intensity * 0.8}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          On a plain surface
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: font.size.sm,
            marginTop: space[1],
            lineHeight: 20,
          }}
        >
          The glint and rim light read on any theme surface without extra styling.
        </Text>
      </GlintCard>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.metaLabel, { color: withAlpha('#FFFFFF', 0.5) }]}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emblem: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  emblemCore: { width: 10, height: 10, borderRadius: 5 },
  overline: { letterSpacing: 2.4, fontWeight: '700' },
  display: { fontWeight: '800', letterSpacing: -1 },
  metaLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  metaValue: { color: '#FFF4EE', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
