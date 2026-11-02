import { defineControls } from '../../demo-kit/types';
import { RainBars } from './rain-bars';

export const controls = defineControls({});

export default function RainBarsDemo() {
  return (
    <RainBars
      title="Steady Rain"
      total={19}
      amounts={[3, 5, 8, 6, 9, 12, 16, 11, 7, 10, 14, 18, 15, 9, 6, 8, 12, 17, 13, 8, 5, 7, 4, 3]}
      times={['NOW', '12:30', '13:00', '13:30']}
    />
  );
}
