import { defineControls, type ControlValues } from '../../demo-kit/types';
import { TideWave } from './tide-wave';

export const controls = defineControls({
  now: { type: 'number', label: 'Hour', min: 0, max: 24, step: 0.25, default: 9 },
});

export default function TideWaveDemo({ now }: ControlValues<typeof controls>) {
  return (
    <TideWave
      tides={[
        { hour: 1, height: 1.2 },
        { hour: 7, height: 6.1 },
        { hour: 13, height: 0.8 },
        { hour: 19, height: 6.6 },
        { hour: 24, height: 2.1 },
      ]}
      now={now}
    />
  );
}
