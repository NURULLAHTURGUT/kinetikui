import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
import { withAlpha } from '../../shared/tokens/tokens';
import { ParallaxHeader } from './parallax-header';

export const controls = defineControls({
  headerHeight: {
    type: 'number',
    label: 'Header height',
    min: 200,
    max: 360,
    step: 10,
    default: 280,
  },
});

const TRACKS = [
  'Glass Harbour',
  'Low Tide',
  'Northbound',
  'Static Bloom',
  'Kestrel',
  'Afterimage',
  'Paper Moons',
  'Long Exposure',
  'Salt & Neon',
  'Quiet Engine',
];

export default function ParallaxHeaderDemo({ headerHeight }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View style={[styles.frame, { borderRadius: radius.xl, borderColor: colors.border }]}>
      <ParallaxHeader
        title="Long Exposure"
        subtitle="Lumen Fields · 10 tracks"
        headerHeight={headerHeight}
        topInset={0}
        header={
          <View
            style={[
              StyleSheet.absoluteFill,
              gradient(
                `linear-gradient(170deg, ${colors.ice} 0%, ${withAlpha(colors.ember, 0.6)} 55%, ${colors.background} 100%)`,
              ),
            ]}
          >
            <View style={[styles.sun, { backgroundColor: withAlpha(colors.highlight, 0.25) }]} />
          </View>
        }
      >
        {TRACKS.map((t, i) => (
          <View
            key={t}
            style={[styles.row, { borderColor: colors.border, paddingHorizontal: space[5] }]}
          >
            <Text style={{ color: colors.textSubtle, width: 28, fontVariant: ['tabular-nums'] }}>
              {i + 1}
            </Text>
            <Text style={{ color: colors.text, fontSize: font.size.md, flex: 1 }}>{t}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {3 + (i % 3)}:{String((i * 17) % 60).padStart(2, '0')}
            </Text>
          </View>
        ))}
      </ParallaxHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 480, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  sun: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: 40, right: 40 },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
