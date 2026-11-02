import { defineControls, type ControlValues } from '../../demo-kit/types';
import { StepsBar } from './steps-bar';

export const controls = defineControls({
  steps: { type: 'number', label: 'Steps', min: 0, max: 10000, step: 50, default: 6317 },
});

export default function StepsBarDemo({ steps }: ControlValues<typeof controls>) {
  return <StepsBar steps={steps} distance="4.2 KM" climb="9 FLOORS" />;
}
