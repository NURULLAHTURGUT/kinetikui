import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { gradient } from '../../shared/tokens/gradient';
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
  intensity: { type: 'number', label: 'Intensity', min: 0, max: 1, step: 0.05, default: 0.8 },
  tiltDegrees: { type: 'number', label: 'Card tilt (°)', min: 0, max: 10, step: 1, default: 5 },
  reduceEffects: { type: 'boolean', label: 'Reduce effects', default: false },
});

// A black metal card looks the same on either theme, so its colours are fixed.
const INK = '#F5F5F5';
const METAL = 'linear-gradient(135deg, #2C2C2C 0%, #121212 42%, #050505 70%, #1C1C1C 100%)';
const CHIP = 'linear-gradient(140deg, #E9E9E9 0%, #9C9C9C 45%, #D6D6D6 70%, #7A7A7A 100%)';

export default function GlintCardDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, shadow } = useKinetikTheme();

  return (
    <View style={{ gap: space[5], alignItems: 'center' }}>
      <GlintCard
        {...props}
        glintColor={colors.highlight}
        radius={20}
        accessibilityRole="summary"
        accessibilityLabel="Kinetik Black card ending 2048"
        style={[styles.card, gradient(METAL), { boxShadow: shadow.lg }]}
        contentStyle={styles.content}
      >
        {/* Fine engraved rings, like the guilloche on a banknote. */}
        <View pointerEvents="none" style={styles.rings}>
          {[220, 180, 140, 100].map((d) => (
            <View
              key={d}
              style={[
                styles.ring,
                { width: d, height: d, borderRadius: d / 2, borderColor: withAlpha(INK, 0.06) },
              ]}
            />
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.brand}>
            <View style={styles.mark}>
              <View style={[styles.markRing, { borderColor: INK }]} />
              <View style={[styles.markDot, { backgroundColor: INK }]} />
            </View>
            <Text style={[styles.wordmark, { color: INK }]}>KINETIK</Text>
          </View>
          <Contactless />
        </View>

        <View style={[styles.chip, gradient(CHIP)]}>
          <View style={[styles.chipLine, { top: 11 }]} />
          <View style={[styles.chipLine, { top: 22 }]} />
          <View style={styles.chipMid} />
        </View>

        <View style={{ gap: space[3] }}>
          <Text style={[styles.number, { color: INK }]}>•••• •••• •••• 2048</Text>
          <View style={[styles.row, { alignItems: 'flex-end' }]}>
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>MEMBER</Text>
              <Text style={[styles.value, { color: INK }]}>ALEX MORGAN</Text>
            </View>
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>VALID THRU</Text>
              <Text style={[styles.value, { color: INK }]}>08 / 29</Text>
            </View>
            <Text style={[styles.tier, { color: INK }]}>Black</Text>
          </View>
        </View>
      </GlintCard>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
        Drag across the card or tilt your phone
      </Text>
    </View>
  );
}

/** Three arcs of the contactless symbol, drawn from bordered circles. */
function Contactless() {
  return (
    <View style={styles.wave}>
      {[8, 14, 20].map((r) => (
        <View
          key={r}
          style={[
            styles.arc,
            { width: r * 2, height: r * 2, borderRadius: r, right: 20 - r, top: 10 - r },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 1.586,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  content: { flex: 1, padding: 22, justifyContent: 'space-between' },
  rings: {
    position: 'absolute',
    right: -70,
    top: -60,
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 26, height: 16, justifyContent: 'center' },
  markRing: {
    position: 'absolute',
    left: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  markDot: { position: 'absolute', left: 10, width: 16, height: 16, borderRadius: 8 },
  wordmark: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  wave: { width: 24, height: 20 },
  arc: {
    position: 'absolute',
    borderWidth: 0,
    borderRightWidth: 2,
    borderColor: 'transparent',
    borderRightColor: 'rgba(245, 245, 245, 0.7)',
    transform: [{ scaleY: 0.9 }],
  },
  chip: {
    width: 46,
    height: 34,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.35)',
  },
  chipLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  chipMid: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 14,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.35)',
  },
  number: { fontSize: 18, fontWeight: '600', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  label: { fontSize: 8, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(245, 245, 245, 0.45)' },
  value: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },
  tier: { fontSize: 18, fontWeight: '300', fontStyle: 'italic', letterSpacing: 0.5 },
});
