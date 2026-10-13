import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Treemap, nodeValue, squarify } from './treemap';

const DATA = [
  {
    key: 'stays',
    label: 'Stays',
    children: [
      { key: 'hotels', label: 'Hotels', value: 30 },
      { key: 'cabins', label: 'Cabins', value: 20 },
    ],
  },
  { key: 'flights', label: 'Flights', value: 35 },
  { key: 'food', label: 'Food', value: 15 },
];

describe('squarify', () => {
  it('fills the rect exactly, with no overlaps', () => {
    const rects = squarify([6, 6, 4, 3, 2, 2, 1], { x: 0, y: 0, w: 600, h: 400 });
    const area = rects.reduce((a, r) => a + r.w * r.h, 0);
    expect(area).toBeCloseTo(600 * 400, 3);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-6);
      expect(r.y).toBeGreaterThanOrEqual(-1e-6);
      expect(r.x + r.w).toBeLessThanOrEqual(600 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(400 + 1e-6);
    }
    // Area is proportional to value.
    expect(rects[0]!.w * rects[0]!.h).toBeCloseTo((6 / 24) * 600 * 400, 3);
  });

  it('sums parents from their children', () => {
    expect(nodeValue(DATA[0]!)).toBe(50);
  });
});

describe('Treemap', () => {
  async function layout() {
    await act(async () => {
      fireEvent(screen.getByLabelText('Trip spending'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 280 } },
      });
    });
  }

  it('labels tiles with value and share, and zooms into parents', async () => {
    await render(<Treemap accessibilityLabel="Trip spending" data={DATA} />);
    await layout();
    expect(screen.getByRole('text', { name: 'Flights, 35, 35%' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Stays, 50, 50%, has parts' }));
    expect(screen.getByRole('text', { name: 'Hotels, 30, 60%' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back to All' })).toBeOnTheScreen();
  });

  it('zooms back out from the trail', async () => {
    await render(<Treemap accessibilityLabel="Trip spending" data={DATA} rootLabel="Everything" />);
    await layout();
    await fireEvent.press(screen.getByRole('button', { name: /^Stays/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Everything' }));
    expect(screen.getByRole('text', { name: 'Food, 15, 15%' })).toBeOnTheScreen();
    expect(screen.queryByRole('text', { name: /^Hotels/ })).toBeNull();
  });
});
