import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { RouteCard } from './route-card';

export const controls = defineControls({
  progress: { type: 'number', label: 'Progress', min: 0, max: 100, step: 1, default: 58 },
});

export default function RouteCardDemo({ progress }: ControlValues<typeof controls>) {
  const { space } = useKinetikTheme();
  const [at, setAt] = useState(progress);
  const [seen, setSeen] = useState(progress);
  if (progress !== seen) {
    setSeen(progress);
    setAt(progress);
  }
  return (
    <View style={{ width: '100%', gap: space[4], alignItems: 'center' }}>
      <RouteCard
        from={{ code: 'IST', city: 'ISTANBUL', time: '09:40AM' }}
        to={{ code: 'NRT', city: 'TOKYO', time: '03:25PM' }}
        status="ON SCHEDULE"
        tag="KN204"
        progress={at / 100}
      />
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        <PressJelly variant="surface" onPress={() => setAt(0)}>
          Take off
        </PressJelly>
        <PressJelly variant="surface" onPress={() => setAt((p) => Math.min(100, p + 15))}>
          Fly on
        </PressJelly>
      </View>
    </View>
  );
}
