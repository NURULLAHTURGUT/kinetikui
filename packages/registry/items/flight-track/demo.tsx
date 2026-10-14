import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FlightTrack } from './flight-track';

export const controls = defineControls({
  progress: { type: 'number', label: 'Progress', min: 0, max: 100, step: 1, default: 62 },
});

export default function FlightTrackDemo({ progress }: ControlValues<typeof controls>) {
  const { space } = useKinetikTheme();
  const [at, setAt] = useState(progress);
  const [seen, setSeen] = useState(progress);
  if (progress !== seen) {
    setSeen(progress);
    setAt(progress);
  }
  // A live flight creeps forward on its own.
  useEffect(() => {
    const id = setInterval(() => setAt((p) => (p >= 100 ? p : Math.min(100, p + 1))), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{ gap: space[4], width: '100%', maxWidth: 620, alignSelf: 'center' }}>
      <FlightTrack
        from={{ code: 'LHR', city: 'London, UK', time: '20:50', zone: 'GMT+1' }}
        to={{ code: 'OPO', city: 'Porto, PT', time: '22:40', zone: 'GMT+1' }}
        progress={at / 100}
      />
      <View style={{ flexDirection: 'row', gap: space[2], alignSelf: 'center' }}>
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
