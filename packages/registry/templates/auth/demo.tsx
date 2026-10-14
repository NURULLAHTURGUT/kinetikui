import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Auth } from './auth';

export const controls = defineControls({});

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The demo accepts 123456; any other code is wrong.
async function verify(_email: string, code: string) {
  await wait(700);
  if (code !== '123456') throw new Error('Wrong code');
}

export default function AuthDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>Signed in</Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setDone(false);
            setRun((r) => r + 1);
          }}
        >
          Start over
        </PressJelly>
      </View>
    );
  }
  return (
    <Auth
      key={run}
      initialEmail="ada@example.com"
      onSendCode={() => wait(900)}
      onVerify={verify}
      onDone={() => setDone(true)}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
