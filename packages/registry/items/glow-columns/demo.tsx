import { defineControls } from '../../demo-kit/types';
import { GlowColumns } from './glow-columns';

export const controls = defineControls({});

export default function GlowColumnsDemo() {
  return (
    <GlowColumns
      values={[0, 0, 1, 2, 4, 6, 7, 8, 8, 7, 5, 3, 2, 1, 1, 0, 0, 0]}
      current={5}
      max={10}
      level="MODERATE"
      name="UVI"
      labels={['12', '14', '16', '18', '20', '22']}
    />
  );
}
