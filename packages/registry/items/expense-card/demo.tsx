import { useState } from 'react';
import { View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ExpenseCard } from './expense-card';

export const controls = defineControls({});

const DATA = {
  Weekly: [
    { label: 'Housing', value: 0 },
    { label: 'Utilities', value: 0 },
    { label: 'Food', value: 0 },
  ],
  Monthly: [
    { label: 'Housing', value: 6200 },
    { label: 'Utilities', value: 1400 },
    { label: 'Food', value: 2150 },
  ],
  Yearly: [
    { label: 'Housing', value: 74400 },
    { label: 'Utilities', value: 16800 },
    { label: 'Food', value: 25800 },
  ],
} as const;

type Period = keyof typeof DATA;

export default function ExpenseCardDemo() {
  const { colors, space } = useKinetikTheme();
  const [period, setPeriod] = useState<Period>('Monthly');
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: space[3] }}>
      <ExpenseCard
        icon={<DemoIcon name="note" color={colors.text} size={22} />}
        rows={DATA[period]}
        periods={['Weekly', 'Monthly', 'Yearly'] as const}
        period={period}
        onPeriodChange={setPeriod}
        max={period === 'Weekly' ? 10000 : undefined}
      />
    </View>
  );
}
