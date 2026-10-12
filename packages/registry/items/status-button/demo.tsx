import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StatusButton, type ButtonStatus } from './status-button';

export const controls = defineControls({
  outcome: {
    type: 'select',
    label: 'Next result',
    options: ['success', 'error'],
    default: 'success',
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function StatusButtonDemo({ outcome, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pay = () => {
    setStatus('loading');
    timers.current.push(
      setTimeout(() => {
        setStatus(outcome);
        if (outcome === 'success') timers.current.push(setTimeout(() => setStatus('idle'), 2200));
      }, 1500),
    );
  };

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[6],
          gap: space[5],
        },
      ]}
    >
      <View style={{ gap: space[1] }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Order total</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size['3xl'],
            fontWeight: font.weight.bold,
            letterSpacing: -1,
            fontVariant: ['tabular-nums'],
          }}
        >
          $24.00
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
          Visa ending 4242 · Arrives Thursday
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StatusButton
        status={status}
        onPress={pay}
        successLabel="Paid"
        errorLabel="Card declined"
        haptics={haptics}
        style={{ alignSelf: 'center' }}
      >
        Pay $24.00
      </StatusButton>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderWidth: StyleSheet.hairlineWidth },
  divider: { height: StyleSheet.hairlineWidth },
});
