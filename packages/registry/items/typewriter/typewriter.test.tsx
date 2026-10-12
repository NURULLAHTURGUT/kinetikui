import { act, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { Typewriter } from './typewriter';

// Each step schedules the next one after React commits, so time moves in small slices.
const advance = async (ms: number) => {
  for (let t = 0; t < ms; t += 10) {
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
  }
};
/** The visible text, caret included; screen readers get the label instead. */
const visible = (text: string) => screen.getByText(text, { includeHiddenElements: true });

describe('Typewriter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('types a phrase, holds it, erases it and types the next', async () => {
    const onPhraseTyped = jest.fn();
    await render(
      <Typewriter phrases={['Peru', 'Fiji']} speed={10} hold={500} onPhraseTyped={onPhraseTyped} />,
    );
    // Screen readers get the whole phrase from the start.
    expect(screen.getByLabelText('Peru')).toBeOnTheScreen();
    expect(visible('|')).toBeOnTheScreen();

    await advance(200);
    expect(visible('Peru|')).toBeOnTheScreen();
    expect(onPhraseTyped).toHaveBeenLastCalledWith(0);

    await advance(500 + 4 * 26 + 50);
    expect(screen.getByLabelText('Fiji')).toBeOnTheScreen();
    await advance(200);
    expect(visible('Fiji|')).toBeOnTheScreen();
    expect(onPhraseTyped).toHaveBeenLastCalledWith(1);
  });

  it('stops after the last phrase without loop', async () => {
    await render(<Typewriter phrases={['One', 'Two']} speed={10} hold={100} loop={false} />);
    await advance(5000);
    expect(screen.getByLabelText('Two')).toBeOnTheScreen();
    expect(visible('Two|')).toBeOnTheScreen();
  });

  it('shows whole phrases with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <Typewriter prefix="Go to " phrases={['Peru', 'Fiji']} hold={300} />
      </KinetikProvider>,
    );
    expect(screen.getByLabelText('Go to Peru')).toBeOnTheScreen();
    await advance(300);
    expect(screen.getByLabelText('Go to Fiji')).toBeOnTheScreen();
  });
});
