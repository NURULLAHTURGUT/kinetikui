import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RevealField } from './reveal-field';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function RevealFieldDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [password, setPassword] = useState('quiet-harbour-41');
  return (
    <View style={{ gap: space[3] }}>
      <RevealField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 12 characters"
        autoComplete="new-password"
        haptics={haptics}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        Tap the eye to check what you typed.
      </Text>
    </View>
  );
}
