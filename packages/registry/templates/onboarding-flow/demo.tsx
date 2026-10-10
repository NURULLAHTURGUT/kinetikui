import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { OnboardingFlow } from './onboarding-flow';

export const controls = defineControls({});

export default function OnboardingFlowDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <View style={[styles.done, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          Welcome aboard
        </Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setDone(false);
            setRun((r) => r + 1);
          }}
        >
          Replay onboarding
        </PressJelly>
      </View>
    );
  }
  return <OnboardingFlow key={run} onFinish={() => setDone(true)} />;
}

const styles = StyleSheet.create({
  done: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
