import { defineControls } from '../../demo-kit/types';
import { MonthBars } from './month-bars';

export const controls = defineControls({});

export default function MonthBarsDemo() {
  return (
    <MonthBars
      months={[
        { label: 'MAY', value: 1840.5 },
        { label: 'JUN', value: 2410.2 },
        { label: 'JUL', value: 1975.75 },
        { label: 'AUG', value: 2120 },
        { label: 'SEP', value: 2187.19 },
        { label: 'OCT', value: 2316.3 },
      ]}
    />
  );
}
