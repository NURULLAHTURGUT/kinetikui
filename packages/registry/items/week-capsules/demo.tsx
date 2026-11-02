import { defineControls } from '../../demo-kit/types';
import { WeekCapsules } from './week-capsules';

export const controls = defineControls({});

export default function WeekCapsulesDemo() {
  return (
    <WeekCapsules
      days={[
        { label: 'F', minutes: 22 },
        { label: 'S', minutes: 34 },
        { label: 'S', minutes: 18 },
        { label: 'M', minutes: 41 },
        { label: 'T', minutes: 38 },
        { label: 'W', minutes: 45 },
        { label: 'T', minutes: 19 },
      ]}
      goal={30}
    />
  );
}
