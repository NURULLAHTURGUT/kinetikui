import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Paywall } from './paywall';

export const controls = defineControls({});

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function PaywallDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [closed, setClosed] = useState(false);

  if (closed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>Paywall dismissed</Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setClosed(false);
            setRun((r) => r + 1);
          }}
        >
          Show again
        </PressJelly>
      </View>
    );
  }
  return (
    <Paywall
      key={run}
      onPurchase={() => wait(1200)}
      onClose={() => setClosed(true)}
      onRestore={() => {}}
      onTerms={() => {}}
      onPrivacy={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
