import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RollStepper } from './roll-stepper';

export const controls = defineControls({
  repeat: { type: 'boolean', label: 'Hold to repeat', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const NIGHTLY = 184;

export default function RollStepperDemo({ repeat, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(3);

  const row = (title: string, detail: string, control: ReactNode) => (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{detail}</Text>
      </View>
      {control}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          gap: space[4],
          paddingBottom: space[5],
        },
      ]}
    >
      <Image source={photo('lonePalm')} style={styles.cover} accessibilityIgnoresInvertColors />
      <View style={{ paddingHorizontal: space[5], gap: space[4] }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Beach house, Fiji
        </Text>
        {row(
          'Guests',
          'Up to 6',
          <RollStepper
            label="Guests"
            value={guests}
            onValueChange={setGuests}
            min={1}
            max={6}
            repeat={repeat}
            haptics={haptics}
          />,
        )}
        {row(
          'Nights',
          `$${NIGHTLY} a night`,
          <RollStepper
            label="Nights"
            value={nights}
            onValueChange={setNights}
            min={1}
            max={30}
            repeat={repeat}
            haptics={haptics}
          />,
        )}
        <View style={[styles.total, { borderTopColor: colors.border, paddingTop: space[3] }]}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Total</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.lg,
              fontWeight: font.weight.bold,
              fontVariant: ['tabular-nums'],
            }}
          >
            ${(NIGHTLY * nights).toLocaleString('en-US')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cover: { width: '100%', height: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
