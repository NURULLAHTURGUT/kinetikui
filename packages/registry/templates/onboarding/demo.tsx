import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Onboarding } from './onboarding';

export const controls = defineControls({});

export default function OnboardingDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{done}</Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setDone(null);
            setRun((r) => r + 1);
          }}
        >
          Start over
        </PressJelly>
      </View>
    );
  }
  return (
    <Onboarding
      key={run}
      onFinish={() => setDone('Onboarding finished')}
      onSkip={() => setDone('Skipped for now')}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
