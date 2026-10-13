import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FloatField } from './float-field';

export const controls = defineControls({
  showError: { type: 'boolean', label: 'Validate email', default: true },
});

export default function FloatFieldDemo({ showError }: ControlValues<typeof controls>) {
  const { space } = useKinetikTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const bad = showError && touched && email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);

  return (
    <View style={{ gap: space[4] }}>
      <FloatField
        label="Full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
      />
      <FloatField
        label="Email"
        hint="We only use it for receipts."
        error={bad ? 'That does not look like an email address.' : undefined}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
    </View>
  );
}
