import { defineControls, type ControlValues } from '../../demo-kit/types';
import { CruiseDial } from './cruise-dial';

export const controls = defineControls({
  speed: { type: 'number', label: 'Speed', min: 0, max: 900, step: 1, default: 842 },
});

export default function CruiseDialDemo({ speed }: ControlValues<typeof controls>) {
  return <CruiseDial speed={speed} tag="KN204" label="CEILING:" reading="11,234 M" />;
}
