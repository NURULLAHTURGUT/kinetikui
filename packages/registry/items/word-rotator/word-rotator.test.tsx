import { act, render, screen } from '@testing-library/react-native';

import { WordRotator } from './word-rotator';

const letters = (word: string) =>
  Array.from(word).every(
    (ch) => screen.queryAllByText(ch, { includeHiddenElements: true }).length > 0,
  );

describe('WordRotator', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads the whole line with every word', async () => {
    await render(<WordRotator before="Make it" words={['fast', 'calm']} after="today" />);
    expect(screen.getByLabelText('Make it fast, calm today')).toBeOnTheScreen();
  });

  it('moves on to the next word after each interval, and stays put when paused', async () => {
    const { rerender } = await render(<WordRotator words={['ab', 'xy']} interval={1000} />);
    expect(letters('ab')).toBe(true);
    expect(screen.queryAllByText('x', { includeHiddenElements: true })).toHaveLength(1); // measured copy only

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    // The new word is drawn (plus its measured copy); the old one is still rolling out.
    expect(screen.queryAllByText('x', { includeHiddenElements: true })).toHaveLength(2);

    await rerender(<WordRotator words={['ab', 'xy']} interval={1000} paused />);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryAllByText('x', { includeHiddenElements: true })).toHaveLength(2);
  });
});
