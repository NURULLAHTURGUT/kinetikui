import { useState } from 'react';
import { View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TimeSplit } from './time-split';

export const controls = defineControls({});

const LABELS = ['Sketching', 'Coding', 'Reviews', 'Reading', 'Music', 'Other'];
const DAYS = [
  [38, 112, 44, 26, 34, 22],
  [96, 52, 18, 64, 20, 41],
  [20, 168, 62, 12, 28, 15],
];

export default function TimeSplitDemo() {
  const { space } = useKinetikTheme();
  const [day, setDay] = useState(0);
  return (
    <View style={{ width: '100%', gap: space[4], alignItems: 'center' }}>
      <TimeSplit
        title="Studio Hours"
        items={LABELS.map((label, i) => ({ label, minutes: DAYS[day]![i]! }))}
      />
      <View style={{ flexDirection: 'row' }}>
        <PressJelly variant="surface" onPress={() => setDay((d) => (d + 1) % DAYS.length)}>
          Next day
        </PressJelly>
      </View>
    </View>
  );
}
