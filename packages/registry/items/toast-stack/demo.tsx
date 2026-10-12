import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ToastProvider, useToast, type ToastOptions } from './toast-stack';

export const controls = defineControls({
  placement: { type: 'select', label: 'Placement', options: ['top', 'bottom'], default: 'top' },
  duration: {
    type: 'number',
    label: 'Duration (ms)',
    min: 1500,
    max: 8000,
    step: 500,
    default: 4000,
  },
});

export default function ToastStackDemo({ placement, duration }: ControlValues<typeof controls>) {
  return (
    <View style={styles.stage}>
      <ToastProvider placement={placement} duration={duration} safeArea={false}>
        <Triggers />
      </ToastProvider>
    </View>
  );
}

const samples: ToastOptions[] = [
  { title: 'Build 1031 is live', description: 'Rolled out to 100% of users.', tone: 'success' },
  {
    title: 'Card removed',
    description: 'Night Pass was moved to the archive.',
    action: { label: 'Undo', onPress: () => {} },
  },
  { title: 'Storage almost full', description: '92% of 5 GB used.', tone: 'warning' },
  {
    title: 'Payment failed',
    description: 'The card was declined. Try another one.',
    tone: 'danger',
  },
];

function Triggers() {
  const toast = useToast();
  const { colors, font, radius, space } = useKinetikTheme();
  const [next, setNext] = useState(0);

  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radius.pill,
          backgroundColor: primary ? colors.ember : colors.surfaceRaised,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
          paddingHorizontal: space[5],
        },
      ]}
    >
      <Text
        style={{
          color: primary ? colors.onEmber : colors.text,
          fontSize: font.size.sm,
          fontWeight: font.weight.semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.triggers, { gap: space[3] }]}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        Tap the stack to fan it out · swipe a toast away
      </Text>
      <View style={[styles.row, { gap: space[2] }]}>
        {button(
          'Show toast',
          () => {
            toast.show(samples[next % samples.length]!);
            setNext(next + 1);
          },
          true,
        )}
        {button('Clear', () => toast.dismissAll())}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 340, justifyContent: 'center' },
  triggers: { alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  button: { minHeight: 44, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
