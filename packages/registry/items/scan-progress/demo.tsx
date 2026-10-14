import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ScanProgress } from './scan-progress';

export const controls = defineControls({
  mode: { type: 'select', label: 'Progress', options: ['known', 'unknown'], default: 'known' },
});

const STEPS = ['Uploading clip…', 'Analyzing swing motion…', 'Scoring your form…'];

export default function ScanProgressDemo({ mode }: ControlValues<typeof controls>) {
  const { space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [at, setAt] = useState(0);

  // Stand-in for real work: a few percent at a time, then done.
  useEffect(() => {
    const id = setInterval(() => setAt((p) => Math.min(1, p + 0.04)), 450);
    return () => clearInterval(id);
  }, [run]);

  const done = at >= 1;
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(at * STEPS.length))]!;
  return (
    <View style={{ gap: space[4], width: '100%', maxWidth: 380, alignSelf: 'center' }}>
      <ScanProgress
        source={photo('whiteSands')}
        imageLabel="Desert dunes at dusk"
        height={240}
        progress={mode === 'known' ? at : undefined}
        done={done}
        label={step}
      />
      <PressJelly
        variant="surface"
        style={{ alignSelf: 'center' }}
        onPress={() => {
          setAt(0);
          setRun((r) => r + 1);
        }}
      >
        Analyze again
      </PressJelly>
    </View>
  );
}
