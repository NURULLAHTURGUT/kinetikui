import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { palettes } from '../../shared/tokens/tokens';
import { ScoreMatrix } from './score-matrix';

export const controls = defineControls({
  score: { type: 'number', label: 'Score', min: 0, max: 100, step: 1, default: 13 },
});

const ink = palettes.dark.background;

export default function ScoreMatrixDemo({ score }: ControlValues<typeof controls>) {
  // Tap the card for another week's numbers.
  const [week, setWeek] = useState(0);
  const bump = week % 2 === 1;
  return (
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show another week"
        onPress={() => setWeek((w) => w + 1)}
      >
        <ScoreMatrix
          label="Athletic score"
          score={bump ? Math.min(100, score + 9) : score}
          metrics={[
            {
              label: 'Sleep',
              value: bump ? 91 : 88,
              tone: 'hsl(18, 80%, 52%)',
              icon: <DemoIcon name="moon" color={ink} size={18} strokeWidth={2.2} />,
            },
            {
              label: 'Strength',
              value: bump ? 175 : 170,
              unit: 'lbs',
              tone: 'hsl(75, 30%, 45%)',
              icon: <DemoIcon name="barbell" color={ink} size={18} strokeWidth={2.2} />,
            },
            {
              label: 'Steps',
              value: bump ? 6420 : 1982,
              tone: 'hsl(265, 45%, 66%)',
              icon: <DemoIcon name="shoe" color={ink} size={18} strokeWidth={2.2} />,
            },
            {
              label: 'VO2 max',
              value: bump ? 53 : 52,
              tone: 'hsl(195, 45%, 64%)',
              icon: <DemoIcon name="heart" color={ink} size={18} strokeWidth={2.2} />,
            },
          ]}
        />
      </Pressable>
    </View>
  );
}
