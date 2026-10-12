import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ScrambleText, scrambleFrame } from './scramble-text';

describe('ScrambleText', () => {
  it('exposes the settled text to screen readers as one element', async () => {
    await render(<ScrambleText text="KINETIK" />);
    expect(screen.getByLabelText('KINETIK')).toBeOnTheScreen();
    expect(screen.getByRole('text', { name: 'KINETIK' })).toBeOnTheScreen();
  });

  it('updates the accessible text when the text changes', async () => {
    const { rerender } = await render(<ScrambleText text="ALPHA" />);
    await rerender(<ScrambleText text="BRAVO" />);
    expect(screen.getByLabelText('BRAVO')).toBeOnTheScreen();
    expect(screen.queryByLabelText('ALPHA')).toBeNull();
  });

  it('sizes itself with the settled text', async () => {
    await render(<ScrambleText text="SIZE ME" />);
    expect(screen.getByText('SIZE ME', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders the final text directly under reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <ScrambleText text="STILL" />
      </KinetikProvider>,
    );
    expect(screen.getAllByText('STILL', { includeHiddenElements: true })).toHaveLength(2);
  });
});

describe('scrambleFrame', () => {
  it('starts fully scrambled except for spaces', () => {
    const { text, settled } = scrambleFrame('AB CD', 0, 900, 100, 'xyz');
    expect(settled).toBe(false);
    expect(text).toMatch(/^[xyz]{2} [xyz]{2}$/);
  });

  it('settles on the goal once the duration has passed', () => {
    expect(scrambleFrame('KINETIK', 1000, 900, 0, '#')).toEqual({ text: 'KINETIK', settled: true });
  });

  it('locks characters in from left to right', () => {
    const { text } = scrambleFrame('ABCDEFGH', 500, 900, 0, '#');
    const locked = text.split('').map((c, i) => c === 'ABCDEFGH'[i]);
    expect(locked[0]).toBe(true);
    expect(locked[7]).toBe(false);
  });

  it('is deterministic for the same time', () => {
    expect(scrambleFrame('REPLAY', 220, 900, 0, 'ABC')).toEqual(
      scrambleFrame('REPLAY', 220, 900, 0, 'ABC'),
    );
  });
});
