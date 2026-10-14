import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PlanPicker } from './plan-picker';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function PlanPickerDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [plan, setPlan] = useState('yearly');
  const [started, setStarted] = useState(false);
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: space[3] }}>
      <PlanPicker
        value={plan}
        onChange={(p) => {
          setPlan(p);
          setStarted(false);
        }}
        plans={[
          {
            id: 'yearly',
            title: 'Yearly',
            note: '14-day free trial',
            monthly: '7.49$',
            billed: '89.98/yr',
          },
          { id: 'monthly', title: 'Monthly', note: '7-day free trial', monthly: '9.98$' },
        ]}
        footnote="If you don’t like it, we’ll give your money back."
        cta={{ label: 'Start free trial', onPress: () => setStarted(true) }}
        haptics={haptics}
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {started ? `Trial started on the ${plan} plan` : ' '}
      </Text>
    </View>
  );
}
