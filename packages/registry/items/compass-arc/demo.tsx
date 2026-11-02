import { defineControls, type ControlValues } from '../../demo-kit/types';
import { CompassArc } from './compass-arc';

export const controls = defineControls({
  heading: { type: 'number', label: 'Heading', min: 0, max: 359, step: 1, default: 320 },
});

export default function CompassArcDemo({ heading }: ControlValues<typeof controls>) {
  return <CompassArc heading={heading} note="23 M" />;
}
