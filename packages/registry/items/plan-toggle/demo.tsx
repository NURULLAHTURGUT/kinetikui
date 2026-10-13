import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PlanPrice, PlanToggle } from './plan-toggle';

export const controls = defineControls({
  periods: { type: 'select', label: 'Periods', options: ['two', 'three'], default: 'two' },
});

const MONTHLY = 18;
const PRICE: Record<string, number> = { monthly: MONTHLY, yearly: 14, lifetime: 9 };

export default function PlanToggleDemo({ periods }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [period, setPeriod] = useState('yearly');
  const options = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly', badge: '−22%' },
    ...(periods === 'three' ? [{ value: 'lifetime', label: '3 years', badge: '−50%' }] : []),
  ];
  const current = options.some((o) => o.value === period) ? period : 'yearly';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <PlanToggle
        accessibilityLabel="Billing period"
        options={options}
        value={current}
        onValueChange={setPeriod}
      />
      <View style={{ gap: 4 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Pro
        </Text>
        <PlanPrice amount={PRICE[current]!} suffix="/ month" />
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {current === 'monthly'
            ? 'Billed monthly. Cancel any time.'
            : `Billed $${PRICE[current]! * (current === 'yearly' ? 12 : 36)} up front.`}
        </Text>
      </View>
      {['Unlimited projects', 'Version history', 'Priority support'].map((f) => (
        <View key={f} style={styles.feature}>
          <View style={[styles.dot, { backgroundColor: colors.azure }]} />
          <Text style={{ color: colors.text, fontSize: font.size.sm }}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
