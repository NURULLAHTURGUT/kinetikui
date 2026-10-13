import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MoneyField } from './money-field';

export const controls = defineControls({
  currency: { type: 'select', label: 'Currency', options: ['$', '€', '£'], default: '$' },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const QUICK = [500, 2000, 10000];

export default function MoneyFieldDemo({ currency, haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [amount, setAmount] = useState(4250);
  const euro = currency === '€';

  return (
    <View style={{ gap: space[4], alignItems: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Send to Maya</Text>
      <MoneyField
        label="Amount to send"
        value={amount}
        onChangeValue={setAmount}
        currency={currency}
        groupSeparator={euro ? '.' : ','}
        decimalSeparator={euro ? ',' : '.'}
        haptics={haptics}
      />
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {QUICK.map((q) => (
          <Pressable
            key={q}
            onPress={() => setAmount((a) => Math.min(99_999_999, a + q))}
            accessibilityRole="button"
            accessibilityLabel={`Add ${currency}${q / 100}`}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: space[4],
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            })}
          >
            <Text style={{ color: colors.text, fontSize: font.size.sm }}>
              +{currency}
              {q / 100}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setAmount(0)}
          accessibilityRole="button"
          accessibilityLabel="Clear"
          style={{ minHeight: 44, paddingHorizontal: space[3], justifyContent: 'center' }}
        >
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}
