import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { VitalArcs } from './vital-arcs';

export const controls = defineControls({});

const DAYS = [
  {
    title: 'Today · 21 Feb',
    sleep: '7h 2m',
    change: '12%',
    up: true,
    bpm: 56,
    rings: [31, 84, 53],
    score: 16,
  },
  {
    title: 'Yesterday',
    sleep: '6h 10m',
    change: '8%',
    up: false,
    bpm: 61,
    rings: [58, 47, 72],
    score: 11,
  },
];

export default function VitalArcsDemo() {
  const { colors } = useKinetikTheme();
  // Tap the card to flip between two days and watch the arcs re-sweep.
  const [index, setIndex] = useState(0);
  const day = DAYS[index]!;
  return (
    <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show another day"
        onPress={() => setIndex((i) => (i + 1) % DAYS.length)}
      >
        <VitalArcs
          title={day.title}
          metrics={[
            {
              icon: <DemoIcon name="moon" color={colors.sky} size={26} />,
              value: day.sleep,
              label: 'Sleep time',
              change: { text: day.change, up: day.up },
            },
            {
              icon: <DemoIcon name="heart" color={colors.danger} size={26} />,
              value: `${day.bpm} bpm`,
              label: 'Avg. heart rate',
            },
          ]}
          rings={[
            { value: day.rings[0]!, label: 'Activity' },
            { value: day.rings[1]!, label: 'Workouts' },
            { value: day.rings[2]!, label: 'Rest' },
          ]}
          score={day.score}
          scoreLabel="PAI"
        />
      </Pressable>
    </View>
  );
}
