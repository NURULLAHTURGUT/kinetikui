import { defineControls, type ControlValues } from '../../demo-kit/types';
import { PulseRange } from './pulse-range';

export const controls = defineControls({
  bpm: { type: 'number', label: 'Heart rate', min: 52, max: 168, step: 1, default: 112 },
});

export default function PulseRangeDemo({ bpm }: ControlValues<typeof controls>) {
  return <PulseRange bpm={bpm} min={52} max={168} average={74} ago="JUST NOW" />;
}
