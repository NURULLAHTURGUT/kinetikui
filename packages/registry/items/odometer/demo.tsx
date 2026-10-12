import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Odometer } from './odometer';

export const controls = defineControls({
  stagger: { type: 'number', label: 'Column stagger (ms)', min: 0, max: 80, step: 4, default: 24 },
  live: { type: 'boolean', label: 'Live ticker', default: true },
});

export default function OdometerDemo({ stagger, live }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [revenue, setRevenue] = useState(48_260.5);
  const [users, setUsers] = useState(997);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setRevenue((r) => Math.max(0, r + (Math.random() - 0.35) * 900));
      setUsers((u) => u + Math.round(Math.random() * 3));
    }, 1600);
    return () => clearInterval(t);
  }, [live]);

  const step = (label: string, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 1`}
      onPress={() => setUsers((u) => Math.max(0, u + delta))}
      style={({ pressed }) => [
        styles.step,
        {
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
        {delta > 0 ? '+' : '−'}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: space[8], paddingVertical: space[4] }}>
      <View style={{ gap: space[1] }}>
        <Text style={[styles.overline, { color: colors.textSubtle }]}>REVENUE TODAY</Text>
        <Odometer
          value={revenue}
          decimals={2}
          locale="en-US"
          prefix="$"
          stagger={stagger}
          style={{ fontSize: font.size['4xl'], fontWeight: font.weight.heavy, letterSpacing: -1 }}
        />
      </View>
      <View style={styles.row}>
        <View style={{ gap: space[1] }}>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>ACTIVE USERS</Text>
          <Odometer
            value={users}
            locale="en-US"
            stagger={stagger}
            style={{ color: colors.ice, fontSize: font.size['2xl'] }}
          />
        </View>
        <View style={[styles.row, { gap: space[2] }]}>
          {step('Remove', -1)}
          {step('Add', 1)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
