import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PeekFolder } from './peek-folder';

const ITEMS = [
  { glyph: 'M12 4v16', color: 'hsl(22, 100%, 52%)' },
  { glyph: 'M4 12h16', color: 'hsl(212, 100%, 52%)' },
];

async function layout(root: Parameters<typeof fireEvent>[0]) {
  await act(async () => {
    fireEvent(root, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 258 } },
    });
  });
}

describe('PeekFolder', () => {
  it('opens and closes on tap', async () => {
    const onOpenChange = jest.fn();
    await render(<PeekFolder label="Assets" items={ITEMS} onOpenChange={onOpenChange} />);
    const folder = screen.getByRole('button', { name: 'Assets' });
    expect(folder).toBeCollapsed();
    await act(async () => {
      fireEvent.press(folder);
    });
    expect(screen.getByRole('button', { name: 'Assets' })).toBeExpanded();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Assets' }));
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('follows a controlled open state', async () => {
    await render(<PeekFolder label="Assets" items={ITEMS} open />);
    expect(screen.getByRole('button', { name: 'Assets' })).toBeExpanded();
  });

  it('shows the arrow button only with onOpen', async () => {
    const onOpen = jest.fn();
    const view = await render(<PeekFolder label="Assets" items={ITEMS} onOpen={onOpen} />);
    await layout(view.root!);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Open Assets' }));
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
