import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { StreakCard, type StreakDay } from './streak-card';

export const controls = defineControls({
  title: {
    type: 'select',
    label: 'Title',
    options: ['Back on track', 'Keep it up', 'On fire'],
    default: 'Back on track',
  },
});

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function StreakCardDemo({ title }: ControlValues<typeof controls>) {
  // Each Continue marks today done and moves on a day, so the streak grows.
  const [count, setCount] = useState(2);
  const today = (count + 1) % WEEK.length;
  const days: StreakDay[] = WEEK.map((label, i) => ({
    label,
    state:
      i < today ? (i === 0 && count < 3 ? 'missed' : 'done') : i === today ? 'today' : 'upcoming',
  }));
  return (
    <View style={{ width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      <StreakCard
        count={count}
        title={title}
        days={days}
        onContinue={() => setCount((c) => (c >= 9 ? 2 : c + 1))}
      />
    </View>
  );
}
