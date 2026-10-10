import { render, screen } from '@testing-library/react-native';

import { WordCascade } from './word-cascade';

describe('WordCascade', () => {
  it('exposes the whole paragraph as one text element', async () => {
    await render(<WordCascade text="Motion should explain" />);
    expect(screen.getByRole('text', { name: 'Motion should explain' })).toBeOnTheScreen();
  });

  it('renders each word separately, hidden from screen readers', async () => {
    await render(<WordCascade text="one two three" />);
    expect(screen.queryByText('one ')).toBeNull();
    for (const word of ['one ', 'two ', 'three ']) {
      expect(screen.getByText(word, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('collapses repeated spaces and keeps line breaks', async () => {
    const { toJSON } = await render(<WordCascade text={'a   b\nc'} />);
    expect(screen.getAllByText(/^[abc]$/, { includeHiddenElements: true })).toHaveLength(3);
    expect(JSON.stringify(toJSON())).toContain('"width":"100%"');
  });

  it('updates when the text changes', async () => {
    const { rerender } = await render(<WordCascade text="first" />);
    await rerender(<WordCascade text="second" />);
    expect(screen.getByRole('text', { name: 'second' })).toBeOnTheScreen();
  });
});
