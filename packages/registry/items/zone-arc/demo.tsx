import { defineControls, type ControlValues } from '../../demo-kit/types';
import { ZoneArc } from './zone-arc';

export const controls = defineControls({
  value: { type: 'number', label: 'Value', min: 0, max: 200, step: 1, default: 86 },
});

export default function ZoneArcDemo({ value }: ControlValues<typeof controls>) {
  return (
    <ZoneArc
      value={value}
      min={0}
      zones={[
        { to: 50, color: 'hsl(145, 76%, 44%)' },
        { to: 100, color: 'hsl(50, 90%, 50%)' },
        { to: 150, color: 'hsl(28, 90%, 50%)' },
        { to: 200, color: 'hsl(350, 72%, 44%)' },
      ]}
      unit="AQI"
      ago="4 min ago"
    />
  );
}
