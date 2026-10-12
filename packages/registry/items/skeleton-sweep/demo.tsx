import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Skeleton, SkeletonGroup } from './skeleton-sweep';

export const controls = defineControls({
  period: { type: 'number', label: 'Sweep (ms)', min: 800, max: 3000, step: 100, default: 1400 },
  loading: { type: 'boolean', label: 'Loading', default: true },
});

export default function SkeletonSweepDemo({ period, loading }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();

  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space[4],
  };

  if (!loading) {
    return (
      <View style={{ gap: space[3] }}>
        {['Nora Bell', 'Mira Tan'].map((name) => (
          <View key={name} style={[styles.card, card, { gap: space[3] }]}>
            <View style={[styles.avatar, { backgroundColor: colors.emberSoft }]}>
              <Text style={{ color: colors.ember, fontWeight: font.weight.bold }}>{name[0]}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: font.size.md,
                  fontWeight: font.weight.semibold,
                }}
              >
                {name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                Shared a design file · 2 min ago
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <SkeletonGroup period={period} accessibilityLabel="Loading activity" style={{ gap: space[3] }}>
      {[0, 1].map((i) => (
        <View key={i} style={[styles.card, card, { gap: space[3] }]}>
          <Skeleton circle={44} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="85%" height={12} />
          </View>
        </View>
      ))}
      <View style={[card, { gap: space[3], borderWidth: StyleSheet.hairlineWidth }]}>
        <Skeleton height={120} radius={radius.md} />
        <Skeleton width="40%" height={14} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
