import { fireEvent, render, screen } from '@testing-library/react-native';

import { DotBoard, dotsPath } from './dot-board';

const LINES = ['08:45', [{ text: 'KYOTO' }], [{ text: 'NZ' }, { text: '204' }]];

describe('dotsPath', () => {
  const count = (d: string) => d.split('M').length - 1;

  it('draws every dot of a blank block and only the lit ones of a character', () => {
    expect(count(dotsPath(' ', 0, 0, 4, false))).toBe(35);
    // The hyphen is one row of five dots.
    expect(count(dotsPath('-', 0, 0, 4, true))).toBe(5);
    expect(dotsPath('é', 0, 0, 4, true)).toBe('');
  });

  it('upper-cases letters', () => {
    expect(dotsPath('k', 0, 0, 4, true)).toBe(dotsPath('K', 0, 0, 4, true));
  });
});

describe('DotBoard', () => {
  it('reads the whole board as one label', async () => {
    await render(<DotBoard title="Next Departure" subtitle="Gate twelve" lines={LINES} />);
    expect(
      screen.getByLabelText('Next Departure. Gate twelve. 08:45. KYOTO. NZ204'),
    ).toBeOnTheScreen();
  });

  it('draws once measured and takes new lines', async () => {
    const view = await render(<DotBoard title="Next" lines={LINES} />);
    await fireEvent(
      screen.getByTestId('dot-board-dots', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 240, height: 100 } },
      },
    );
    await view.rerender(<DotBoard title="Next" lines={['11:20', 'OSLO', 'KT718']} />);
    expect(screen.getByLabelText('Next. 11:20. OSLO. KT718')).toBeOnTheScreen();
  });
});
