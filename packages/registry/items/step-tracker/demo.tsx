import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { StepTracker } from './step-tracker';

export const controls = defineControls({
  steps: { type: 'number', label: 'Steps', min: 3, max: 5, step: 1, default: 4 },
});

const ALL = ['Cart', 'Address', 'Delivery', 'Payment', 'Review'];
const COPY: Record<string, string> = {
  Cart: 'Two prints and a frame.',
  Address: 'Where should we send it?',
  Delivery: 'Standard, express or pick-up.',
  Payment: 'Card, wallet or bank transfer.',
  Review: 'Check everything before you pay.',
};

export default function StepTrackerDemo({ steps }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const labels = steps === 5 ? ALL : ALL.filter((s) => s !== 'Delivery').slice(0, steps);
  const [current, setCurrent] = useState(1);
  const step = Math.min(current, labels.length);
  const finished = step >= labels.length;

  const button = (title: string, onPress: () => void, primary: boolean, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.ember : colors.surfaceRaised,
          borderRadius: radius.pill,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
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
        {title}
      </Text>
    </Pressable>
  );

  return (
    <View
      key={steps}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[5],
        },
      ]}
    >
      <StepTracker steps={labels} current={step} onStepPress={setCurrent} />
      <View style={{ gap: 4, minHeight: 48 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          {finished ? 'Order placed' : labels[step]}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {finished ? 'We will email you when it ships.' : COPY[labels[step]!]}
        </Text>
      </View>
      <View style={styles.actions}>
        {button('Back', () => setCurrent(Math.max(0, step - 1)), false, step === 0)}
        {finished
          ? button('Start over', () => setCurrent(0), true)
          : button(
              step === labels.length - 1 ? 'Place order' : 'Continue',
              () => setCurrent(step + 1),
              true,
            )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
});
