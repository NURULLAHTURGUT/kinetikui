import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { InkCheck } from './ink-check';

export const controls = defineControls({
  strike: { type: 'boolean', label: 'Strike through', default: true },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const TASKS = [
  { label: 'Book the flights', description: 'Lisbon, 14 to 21 June' },
  { label: 'Renew passport', description: 'Expires in August' },
  { label: 'Pack the camera', description: 'Two batteries and the wide lens' },
  { label: 'Share the itinerary' },
];

export default function InkCheckDemo({ strike, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [done, setDone] = useState<boolean[]>([true, false, false, false]);
  const count = done.filter(Boolean).length;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[1],
        },
      ]}
    >
      <View style={[styles.head, { marginBottom: space[2] }]}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Before the trip
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {count} of {TASKS.length}
        </Text>
      </View>
      {TASKS.map((task, i) => (
        <InkCheck
          key={task.label}
          label={task.label}
          description={task.description}
          checked={done[i]!}
          strike={strike}
          haptics={haptics}
          onCheckedChange={(v) => setDone((d) => d.map((x, j) => (j === i ? v : x)))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
