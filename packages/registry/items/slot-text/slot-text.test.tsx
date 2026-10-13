import { act, render, screen } from '@testing-library/react-native';

import { reelGlyphs, SlotText } from './slot-text';

describe('reelGlyphs', () => {
  it('spins through glyphs of the same kind, the same way each time', () => {
    const digits = reelGlyphs('7', 6, 3);
    expect(digits).toHaveLength(6);
    expect(digits.every((c) => /\d/.test(c))).toBe(true);
    expect(reelGlyphs('Q', 4, 9).every((c) => /[A-Z]/.test(c))).toBe(true);
    expect(reelGlyphs('7', 6, 3)).toEqual(digits);
    expect(reelGlyphs('-', 6, 3)).toEqual([]);
  });
});

describe('SlotText', () => {
  it('reads the whole text once', async () => {
    await render(<SlotText text="WIN 250" />);
    expect(screen.getByRole('text', { name: 'WIN 250' })).toBeOnTheScreen();
  });

  it('settles on the new text, dropping reels it no longer needs', async () => {
    jest.useFakeTimers();
    const { rerender } = await render(<SlotText text="1,250" />);
    await rerender(<SlotText text="980" />);
    expect(screen.getByRole('text', { name: '980' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    // Once stopped, the spin strips and the spare reels are gone.
    expect(screen.getAllByText('8', { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.queryByText(',', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByText('5', { includeHiddenElements: true })).toBeNull();
    jest.useRealTimers();
  });
});
