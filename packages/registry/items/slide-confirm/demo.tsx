import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { photo } from '../../demo-kit/photos';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SlideConfirm } from './slide-confirm';

export const controls = defineControls({
  threshold: { type: 'number', label: 'Threshold', min: 0.5, max: 0.95, step: 0.05, default: 0.8 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function SlideConfirmDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [booked, setBooked] = useState(0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[4],
          gap: space[4],
        },
      ]}
    >
      <Image
        source={photo('highlandLake')}
        style={[styles.picture, { borderRadius: radius.lg }]}
        resizeMode="cover"
        accessibilityLabel="A lake between green hills"
      />
      <View style={[styles.row, { paddingHorizontal: space[1] }]}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
          >
            Lakeside Cabin
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            {booked === 0
              ? 'Fri – Sun · 2 guests'
              : `Booked ${booked} time${booked === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size.xl,
            fontWeight: font.weight.bold,
            letterSpacing: -0.6,
            fontVariant: ['tabular-nums'],
          }}
        >
          $360
        </Text>
      </View>
      <SlideConfirm
        {...props}
        label="Slide to book"
        confirmedLabel="Booked"
        onConfirm={() => setBooked((n) => n + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  picture: { width: '100%', aspectRatio: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
