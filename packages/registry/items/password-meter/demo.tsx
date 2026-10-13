import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PasswordMeter, passwordStrength } from './password-meter';

export const controls = defineControls({
  showRules: { type: 'boolean', label: 'Rules', default: true },
});

export default function PasswordMeterDemo({ showRules }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [password, setPassword] = useState('sunrise');
  const ready = passwordStrength(password) >= 3;

  return (
    <View
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
      <View style={{ gap: 4 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Create your account
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Try adding a capital, a number and a symbol.
        </Text>
      </View>
      <PasswordMeter
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        showRules={showRules}
      />
      <View
        style={[
          styles.button,
          { backgroundColor: ready ? colors.ember : colors.track, borderRadius: radius.pill },
        ]}
      >
        <Text
          style={{
            color: ready ? colors.onEmber : colors.textSubtle,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          Continue
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
