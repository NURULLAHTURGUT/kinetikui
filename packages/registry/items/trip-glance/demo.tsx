import { useState } from 'react';
import { View } from 'react-native';

import { PressJelly } from '../../items/press-jelly/press-jelly';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { TripGlance } from './trip-glance';

export const controls = defineControls({
  progress: { type: 'number', label: 'Progress', min: 0, max: 100, step: 1, default: 34 },
});

export default function TripGlanceDemo({ progress }: ControlValues<typeof controls>) {
  const [left, setLeft] = useState(176);
  return (
    <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
      <TripGlance
        code="KN81"
        destination="OSL"
        minutesLeft={left}
        progress={progress / 100}
        status="Landing early"
        bags={2}
      />
      <View style={{ flexDirection: 'row' }}>
        <PressJelly variant="surface" onPress={() => setLeft((m) => Math.max(0, m - 25))}>
          25 minutes on
        </PressJelly>
      </View>
    </View>
  );
}
