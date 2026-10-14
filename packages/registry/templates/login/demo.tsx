import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Login, type LoginCredentials } from './login';

export const controls = defineControls({});

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Any address works with the password "kinetik"; anything else shows the error.
async function signIn({ password }: LoginCredentials) {
  await wait(1100);
  if (password !== 'kinetik') throw new Error('That password is not right. Try “kinetik”.');
}

export default function LoginDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  if (note) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{note}</Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setNote(null);
            setRun((r) => r + 1);
          }}
        >
          Back to log in
        </PressJelly>
      </View>
    );
  }
  return (
    <Login
      key={run}
      onLogin={signIn}
      onForgotPassword={() => setNote('Reset link sent')}
      onSignUp={() => setNote('Sign-up opens here')}
      providers={[
        {
          id: 'apple',
          label: 'Continue with Apple',
          icon: <DemoIcon name="apple" color={colors.text} size={20} />,
          onPress: () => setNote('Signing in with Apple'),
        },
        {
          id: 'google',
          label: 'Continue with Google',
          icon: <DemoIcon name="google" color={colors.text} size={20} />,
          onPress: () => setNote('Signing in with Google'),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
