import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ChoiceCards } from './choice-cards';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const PLANS = [
  {
    value: 'starter',
    title: 'Starter',
    description: 'One project and community support.',
    detail: 'Free',
  },
  {
    value: 'studio',
    title: 'Studio',
    badge: 'Popular',
    description: 'Unlimited projects, shared libraries and priority support for the whole team.',
    detail: '$12',
  },
  {
    value: 'scale',
    title: 'Scale',
    description: 'Single sign-on and audit logs.',
    detail: '$29',
  },
];

export default function ChoiceCardsDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [plan, setPlan] = useState('studio');

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Choose a plan
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Per seat, per month. Change any time.
        </Text>
      </View>
      <ChoiceCards
        accessibilityLabel="Plan"
        options={PLANS}
        value={plan}
        onValueChange={setPlan}
        haptics={haptics}
      />
      <Text style={[styles.note, { color: colors.textSubtle, fontSize: font.size.xs }]}>
        You picked {PLANS.find((p) => p.value === plan)?.title}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { textAlign: 'center' },
});
