import { defineControls } from '../../demo-kit/types';
import { DualClock } from './dual-clock';

export const controls = defineControls({});

export default function DualClockDemo() {
  return (
    <DualClock
      zones={[
        { code: 'TYO', offset: 9, face: 'day' },
        { code: 'RIO', offset: -3, face: 'night' },
      ]}
    />
  );
}
