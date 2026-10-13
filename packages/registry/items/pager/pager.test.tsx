import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { Pager, pagerSlots } from './pager';

describe('pagerSlots', () => {
  it('lists every page when they fit', () => {
    expect(pagerSlots(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('keeps the same number of slots around a gap', () => {
    expect(pagerSlots(1, 20)).toEqual([1, 2, 3, 'gap', 20]);
    expect(pagerSlots(9, 20)).toEqual([1, 'gap', 9, 'gap', 20]);
    expect(pagerSlots(20, 20)).toEqual([1, 'gap', 18, 19, 20]);
    expect(pagerSlots(9, 20, 1)).toEqual([1, 'gap', 8, 9, 10, 'gap', 20]);
  });
});

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [page, setPage] = useState(1);
  return (
    <Pager
      page={page}
      pageCount={12}
      onPageChange={(p) => {
        setPage(p);
        onChange?.(p);
      }}
    />
  );
}

describe('Pager', () => {
  it('names each page and marks the current one', async () => {
    await render(<Harness />);
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('moves with the arrows and the numbers', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Next page' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Page 12' }));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([2, 12]);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeOnTheScreen();
  });
});
