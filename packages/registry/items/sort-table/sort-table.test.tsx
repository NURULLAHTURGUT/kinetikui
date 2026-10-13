import { fireEvent, render, screen } from '@testing-library/react-native';

import { SortTable, sortRows, type SortColumn, type SortRow } from './sort-table';

const COLUMNS: SortColumn[] = [
  { key: 'name', title: 'Plan', flex: 2 },
  { key: 'users', title: 'Users', align: 'right' },
  { key: 'mrr', title: 'Revenue', align: 'right', format: (v) => `$${v}` },
];
const ROWS: SortRow[] = [
  { id: 'a', name: 'Studio', users: 120, mrr: 2400 },
  { id: 'b', name: 'Basic', users: 540, mrr: 1600 },
  { id: 'c', name: 'Scale', users: 40, mrr: 3900 },
];

const names = (rows: SortRow[]) => rows.map((r) => r.name);

describe('sortRows', () => {
  it('sorts numbers by size and text alphabetically', () => {
    expect(names(sortRows(ROWS, { key: 'users', dir: 'desc' }))).toEqual([
      'Basic',
      'Studio',
      'Scale',
    ]);
    expect(names(sortRows(ROWS, { key: 'name', dir: 'asc' }))).toEqual([
      'Basic',
      'Scale',
      'Studio',
    ]);
    expect(names(sortRows(ROWS, null))).toEqual(['Studio', 'Basic', 'Scale']);
  });
});

describe('SortTable', () => {
  it('reads each row and each header with its sort state', async () => {
    await render(
      <SortTable columns={COLUMNS} rows={ROWS} initialSort={{ key: 'mrr', dir: 'desc' }} />,
    );
    expect(screen.getByRole('button', { name: 'Revenue, sorted descending' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Users, not sorted' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Plan: Scale, Users: 40, Revenue: $3900')).toBeOnTheScreen();
  });

  it('sorts a new column, then flips it', async () => {
    const onSortChange = jest.fn();
    await render(<SortTable columns={COLUMNS} rows={ROWS} onSortChange={onSortChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Users, not sorted' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'users', dir: 'desc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Users, sorted descending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'users', dir: 'asc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Plan, not sorted' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', dir: 'asc' });
  });
});
