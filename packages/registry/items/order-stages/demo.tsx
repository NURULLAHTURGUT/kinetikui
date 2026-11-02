import { useState } from 'react';
import { View } from 'react-native';

import type { OrderStage } from './order-stages';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { defineControls } from '../../demo-kit/types';
import { OrderStages } from './order-stages';

const STAGES: OrderStage[] = [
  { label: 'COOKING', icon: 'cook' },
  { label: 'PACKING', icon: 'pack' },
  { label: 'ON THE WAY', icon: 'ride' },
  { label: 'DELIVERED', icon: 'check' },
];

export const controls = defineControls({});

export default function OrderStagesDemo() {
  const [stage, setStage] = useState(0);
  return (
    <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
      <OrderStages stages={STAGES} current={stage} minutesLeft={21 - stage * 7} order="Nº 27" />
      <View style={{ flexDirection: 'row' }}>
        <PressJelly variant="surface" onPress={() => setStage((s) => (s + 1) % STAGES.length)}>
          Next stage
        </PressJelly>
      </View>
    </View>
  );
}
