import { defineControls } from '../../demo-kit/types';
import { ArrivalCard } from './arrival-card';

export const controls = defineControls({});

export default function ArrivalCardDemo() {
  return <ArrivalCard code="NRT" city="TOKYO" time="3:25PM" status="ON SCHEDULE" tag="KN204" />;
}
