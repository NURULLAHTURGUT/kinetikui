import { Image, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { LikeBurst } from './like-burst';

export const controls = defineControls({
  size: { type: 'number', label: 'Heart size', min: 20, max: 40, step: 2, default: 26 },
  showCount: { type: 'boolean', label: 'Count', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function LikeBurstDemo({
  size,
  showCount,
  haptics,
}: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[3],
          gap: space[3],
        },
      ]}
    >
      <Image
        source={photo('lastLight')}
        style={[styles.picture, { borderRadius: radius.lg }]}
        accessibilityLabel="Evening light over a mountain valley"
      />
      <View style={[styles.row, { paddingHorizontal: space[2], gap: space[4] }]}>
        <LikeBurst count={showCount ? 248 : undefined} size={size} haptics={haptics} />
        <View style={[styles.row, { gap: 6 }]}>
          <DemoIcon name="message" color={colors.textMuted} />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
            }}
          >
            86
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <DemoIcon name="bookmark" color={colors.textMuted} />
      </View>
      <View style={{ paddingHorizontal: space[2], paddingBottom: space[2], gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Last Light
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          The valley, ten minutes after sunset.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  picture: { width: '100%', aspectRatio: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
