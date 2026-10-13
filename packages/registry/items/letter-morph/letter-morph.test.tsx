import { render, screen } from '@testing-library/react-native';

import { LetterMorph, matchGlyphs } from './letter-morph';

describe('matchGlyphs', () => {
  let n = 0;
  const key = () => `k${n++}`;

  it('keeps the keys of letters the two texts share, in order', () => {
    const save = matchGlyphs([], 'Save', key);
    const saved = matchGlyphs(save, 'Saved', key);
    expect(saved.slice(0, 4).map((g) => g.key)).toEqual(save.map((g) => g.key));
    expect(save.map((g) => g.key)).not.toContain(saved[4]!.key);
  });

  it('never reuses one letter twice', () => {
    const a = matchGlyphs([], 'tot', key);
    const b = matchGlyphs(a, 'ttt', key);
    expect(new Set(b.map((g) => g.key)).size).toBe(3);
  });
});

describe('LetterMorph', () => {
  it('reads the whole text, not letter by letter', async () => {
    const { rerender } = await render(<LetterMorph text="Follow" />);
    expect(screen.getByRole('text', { name: 'Follow' })).toBeOnTheScreen();
    await rerender(<LetterMorph text="Following" />);
    expect(screen.getByRole('text', { name: 'Following' })).toBeOnTheScreen();
  });
});
