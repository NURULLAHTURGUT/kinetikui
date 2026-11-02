import { defineControls, type ControlValues } from '../../demo-kit/types';
import { TimerFrame } from './timer-frame';

export const controls = defineControls({
  running: { type: 'boolean', label: 'Running', default: true },
});

export default function TimerFrameDemo({ running }: ControlValues<typeof controls>) {
  return <TimerFrame total={300} start={217} label="BREW" running={running} />;
}
