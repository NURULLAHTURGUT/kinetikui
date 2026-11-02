import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { CompassArc, cardinal, nearestTurn } from './compass-arc';

const card = (
  <KinetikProvider reduceMotion="always">
    <CompassArc heading={320} note="23 M" />
  </KinetikProvider>
);

describe('CompassArc', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('Heading 320 degrees NW, 23 M')).toBeOnTheScreen();
  });
});

describe('compass helpers', () => {
  it('names the heading', () => {
    expect(cardinal(320)).toBe('NW');
    expect(cardinal(0)).toBe('N');
    expect(cardinal(-90)).toBe('W');
    expect(cardinal(359)).toBe('N');
  });
  it('turns the short way round', () => {
    expect(nearestTurn(350, 10)).toBe(370);
    expect(nearestTurn(10, 350)).toBe(-10);
  });
});
