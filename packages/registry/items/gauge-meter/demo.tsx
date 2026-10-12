import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { GaugeMeter } from './gauge-meter';

export const controls = defineControls({
  sweep: { type: 'number', label: 'Sweep (°)', min: 180, max: 300, step: 20, default: 240 },
  ticks: { type: 'boolean', label: 'Ticks', default: true },
});

/** Readings the demo steps through, one per run. */
const RUNS = [412, 736, 188, 954, 527];

export default function GaugeMeterDemo({ sweep, ticks }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [run, setRun] = useState(0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[3],
        },
      ]}
    >
      <View style={styles.head}>
        <DemoIcon name="wifi" color={colors.azure} size={20} />
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          Studio Wi-Fi
        </Text>
      </View>
      <GaugeMeter
        accessibilityLabel="Download speed"
        value={RUNS[run % RUNS.length]!}
        max={1000}
        unit="Mbps"
        label="Download"
        sweep={sweep}
        ticks={ticks}
        size={232}
        style={{ alignSelf: 'center' }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setRun((r) => r + 1)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.azureSoft,
            borderRadius: radius.pill,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          style={{ color: colors.azure, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Test again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
});
