import { fireEvent, render, screen } from '@testing-library/react-native';

import { TreeView } from './tree-view';

const DATA = [
  {
    id: 'app',
    label: 'app',
    children: [
      { id: 'layout', label: '_layout.tsx', detail: '2 KB' },
      {
        id: 'tabs',
        label: '(tabs)',
        children: [{ id: 'home', label: 'index.tsx', detail: '4 KB' }],
      },
    ],
  },
  { id: 'readme', label: 'README.md', detail: '1 KB' },
];

describe('TreeView', () => {
  it('shows top-level rows and builds children only once opened', async () => {
    await render(<TreeView data={DATA} />);
    expect(screen.getByRole('button', { name: 'app' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ expanded: false }),
    );
    expect(screen.getByRole('button', { name: 'README.md, 1 KB' })).toBeOnTheScreen();
    expect(screen.queryByText('_layout.tsx', { includeHiddenElements: true })).toBeNull();
  });

  it('opens and closes branches', async () => {
    const onSelect = jest.fn();
    await render(<TreeView data={DATA} onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('button', { name: 'app' }));
    expect(screen.getByRole('button', { name: 'app' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ expanded: true }),
    );
    expect(screen.getByRole('button', { name: '_layout.tsx, 2 KB' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '(tabs)' }));
    await fireEvent.press(screen.getByRole('button', { name: 'index.tsx, 4 KB' }));
    expect(onSelect.mock.calls.map((c) => c[0].id)).toEqual(['app', 'tabs', 'home']);

    await fireEvent.press(screen.getByRole('button', { name: 'app' }));
    expect(screen.queryByRole('button', { name: '_layout.tsx, 2 KB' })).toBeNull();
  });

  it('starts with the given branches open and marks the selection', async () => {
    await render(<TreeView data={DATA} defaultExpanded={['app', 'tabs']} selected="home" />);
    expect(screen.getByRole('button', { name: 'index.tsx, 4 KB' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });
});
