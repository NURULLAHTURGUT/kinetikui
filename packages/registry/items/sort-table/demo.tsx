import { defineControls, type ControlValues } from '../../demo-kit/types';
import { SortTable, type SortColumn, type SortRow } from './sort-table';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const COLUMNS: SortColumn[] = [
  { key: 'city', title: 'City', flex: 1.6 },
  {
    key: 'orders',
    title: 'Orders',
    align: 'right',
    format: (v) => Number(v).toLocaleString('en-US'),
  },
  {
    key: 'growth',
    title: 'Growth',
    align: 'right',
    format: (v) => `${Number(v) > 0 ? '+' : ''}${v}%`,
  },
];

const ROWS: SortRow[] = [
  { id: 'lis', city: 'Lisbon', orders: 1840, growth: 12 },
  { id: 'ber', city: 'Berlin', orders: 3120, growth: 4 },
  { id: 'ist', city: 'Istanbul', orders: 2675, growth: 21 },
  { id: 'osl', city: 'Oslo', orders: 980, growth: -3 },
  { id: 'mad', city: 'Madrid', orders: 2210, growth: 9 },
  { id: 'ams', city: 'Amsterdam', orders: 1430, growth: 15 },
];

export default function SortTableDemo({ haptics }: ControlValues<typeof controls>) {
  return (
    <SortTable
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'orders', dir: 'desc' }}
      haptics={haptics}
    />
  );
}
