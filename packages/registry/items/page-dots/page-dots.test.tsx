import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PageDots } from './page-dots';

function Harness({ onChange }: { onChange?: jest.Mock }) {
  const [page, setPage] = useState(1);
  return (
    <PageDots
      count={5}
      index={page}
      onPageChange={(i) => {
        setPage(i);
        onChange?.(i);
      }}
    />
  );
}

describe('PageDots', () => {
  it('reads the page as an adjustable value', async () => {
    await render(<Harness />);
    expect(screen.getByRole('adjustable', { name: 'Page' }).props.accessibilityValue).toEqual({
      min: 1,
      max: 5,
      now: 2,
      text: '2 of 5',
    });
  });

  it('asks for the next and previous page from screen reader actions', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });
    });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(3);
  });

  it('jumps to the tapped dot', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    // Dots are 8 pt with 8 pt gaps after 8 pt of padding: the fourth dot's centre is at 8 + 52.
    await fireEvent.press(screen.getByRole('adjustable'), { nativeEvent: { locationX: 60 } });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });
});
