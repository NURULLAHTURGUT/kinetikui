import { defineControls, type ControlValues } from '../../demo-kit/types';
import { OrbitRadar } from './orbit-radar';

export const controls = defineControls({
  progress: { type: 'number', label: 'Progress', min: 0, max: 100, step: 1, default: 58 },
});

export default function OrbitRadarDemo({ progress }: ControlValues<typeof controls>) {
  return (
    <OrbitRadar
      name="LUNA-2"
      minutes={Math.round(55 - progress * 0.55)}
      progress={progress / 100}
    />
  );
}
