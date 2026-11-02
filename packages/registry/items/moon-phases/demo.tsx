import { useState } from 'react';
import { View } from 'react-native';

import { PressJelly } from '../../items/press-jelly/press-jelly';
import { defineControls } from '../../demo-kit/types';
import { MoonPhases } from './moon-phases';

export const controls = defineControls({});

export default function MoonPhasesDemo() {
  const [night, setNight] = useState(0);
  return (
    <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
      <MoonPhases phase={0.57 + night / 8} />
      <View style={{ flexDirection: 'row' }}>
        <PressJelly variant="surface" onPress={() => setNight((n) => n + 1)}>
          Next phase
        </PressJelly>
      </View>
    </View>
  );
}
