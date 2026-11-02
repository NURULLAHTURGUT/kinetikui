import { useEffect, useState } from 'react';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { DotBoard, type DotBoardLine } from './dot-board';

export const controls = defineControls({
  rotate: { type: 'boolean', label: 'Cycle departures', default: true },
});

const AMBER = 'hsl(30, 92%, 56%)';

const BOARDS: DotBoardLine[][] = [
  ['08:45', [{ text: 'KYOTO', color: AMBER }], [{ text: 'NZ', color: AMBER }, { text: '204' }]],
  ['11:20', [{ text: 'OSLO', color: AMBER }], [{ text: 'KT', color: AMBER }, { text: '718' }]],
  ['16:05', [{ text: 'LISBON', color: AMBER }], [{ text: 'VX', color: AMBER }, { text: '352' }]],
];

export default function DotBoardDemo({ rotate }: ControlValues<typeof controls>) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!rotate) return;
    const id = setInterval(() => setAt((i) => (i + 1) % BOARDS.length), 4000);
    return () => clearInterval(id);
  }, [rotate]);
  return (
    <DotBoard
      title="Next Departure"
      subtitle="Your ride leaves from gate twelve."
      lines={BOARDS[at]!}
    />
  );
}
