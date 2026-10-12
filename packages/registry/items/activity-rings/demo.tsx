import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ActivityRings, type ActivityRing } from './activity-rings';

export const controls = defineControls({
  day: { type: 'select', label: 'Day', options: ['Today', 'Yesterday'], default: 'Today' },
  thickness: { type: 'number', label: 'Thickness', min: 10, max: 24, step: 2, default: 18 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const DAYS: Record<'Today' | 'Yesterday', ActivityRing[]> = {
  Today: [
    { key: 'move', label: 'Move', value: 486, goal: 600 },
    { key: 'steps', label: 'Steps', value: 10_240, goal: 8000 },
    { key: 'focus', label: 'Deep work', value: 38, goal: 90 },
  ],
  Yesterday: [
    { key: 'move', label: 'Move', value: 612, goal: 600 },
    { key: 'steps', label: 'Steps', value: 6400, goal: 8000 },
    { key: 'focus', label: 'Deep work', value: 104, goal: 90 },
  ],
};

const UNIT: Record<string, string> = { move: 'kcal', steps: 'steps', focus: 'min' };

export default function ActivityRingsDemo({
  day,
  thickness,
  haptics,
}: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const rings = DAYS[day];
  const done = rings.filter((r) => r.value >= r.goal).length;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
          {day}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
          {done} of {rings.length} goals closed
        </Text>
      </View>
      <ActivityRings
        accessibilityLabel={`Activity, ${day.toLowerCase()}`}
        rings={rings}
        size={168}
        thickness={thickness}
        haptics={haptics}
        formatValue={(r) => `${r.value.toLocaleString('en-US')} ${UNIT[r.key]}`}
        center={
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.xl,
              fontWeight: font.weight.bold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {Math.round(
              (rings.reduce((s, r) => s + Math.min(1, r.value / r.goal), 0) / rings.length) * 100,
            )}
            %
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
