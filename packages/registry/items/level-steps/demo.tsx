import { defineControls, type ControlValues } from '../../demo-kit/types';
import { LevelSteps } from './level-steps';

export const controls = defineControls({
  value: { type: 'number', label: 'Value', min: 10, max: 60, step: 0.1, default: 47.8 },
});

export default function LevelStepsDemo({ value }: ControlValues<typeof controls>) {
  return (
    <LevelSteps value={value} label="AEROBIC SCORE" rating="STRONG" stops={[15, 25, 34, 44, 53]} />
  );
}
