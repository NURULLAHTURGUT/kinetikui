import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { HeatGrid } from './heat-grid';

export const controls = defineControls({
  weeks: { type: 'number', label: 'Weeks', min: 8, max: 26, step: 1, default: 18 },
  gap: { type: 'number', label: 'Gap', min: 1, max: 5, step: 1, default: 3 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

/** A Monday, so each column is one week. */
const START = Date.UTC(2025, 4, 26);
const DAY = 24 * 60 * 60 * 1000;

/** Rides per day: busier weekends, a quiet stretch in the middle, never random between renders. */
function ridesFor(weeks: number): number[] {
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const weekday = i % 7;
    const wave = Math.sin(i * 12.9898) * 43758.5453;
    const noise = wave - Math.floor(wave);
    const lull = Math.abs(i / 7 - weeks * 0.45) < 1.5 ? 0.3 : 1;
    const peak = weekday >= 5 ? 4.6 : 2.8;
    return Math.max(0, Math.round((peak * noise - 0.5) * lull));
  });
}

const label = (i: number) =>
  new Date(START + i * DAY).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export default function HeatGridDemo({ weeks, gap, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const data = ridesFor(weeks);
  const total = data.reduce((s, v) => s + v, 0);
  const active = data.filter((v) => v > 0).length;

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
        <View style={{ gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}
          >
            Ride log
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
            {active} days on the bike
          </Text>
        </View>
        <Text
          style={{
            color: colors.azure,
            fontSize: font.size['2xl'],
            fontWeight: font.weight.bold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {total}
        </Text>
      </View>
      <HeatGrid
        accessibilityLabel={`Rides per day, last ${weeks} weeks`}
        data={data}
        gap={gap}
        haptics={haptics}
        summary={`${total} rides in ${weeks} weeks · drag to read a day`}
        describe={(i, v) =>
          `${label(i)} · ${v === 0 ? 'Rest day' : `${v} ride${v === 1 ? '' : 's'}`}`
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
