import { useState } from 'react';
import { View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { CreditScore } from './credit-score';

export const controls = defineControls({
  score: { type: 'number', label: 'Score', min: 0, max: 850, step: 10, default: 0 },
});

export default function CreditScoreDemo({ score }: ControlValues<typeof controls>) {
  const { colors, space } = useKinetikTheme();
  const [applied, setApplied] = useState<number | null>(null);
  const shown = applied ?? score;
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: space[3] }}>
      <CreditScore
        score={shown}
        icon={<DemoIcon name="compass" color={colors.text} size={22} />}
        action={{
          label: shown > 0 ? 'Refresh' : 'Apply',
          icon: <DemoIcon name="addCircle" color={colors.text} size={18} />,
          onPress: () => setApplied(Math.round(560 + Math.random() * 250)),
        }}
      />
    </View>
  );
}
