import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { StreamGraph, streamPaths } from './stream-graph';

const LAYERS = [
  { key: 'pop', label: 'Pop', values: [4, 6, 5, 8] },
  { key: 'jazz', label: 'Jazz', values: [2, 2, 3, 2] },
  { key: 'folk', label: 'Folk', values: [1, 3, 2, 4] },
];

describe('streamPaths', () => {
  it('stacks layers around the middle and keeps them morphable', () => {
    const a = streamPaths(LAYERS, 300, 200);
    const b = streamPaths(
      LAYERS.map((l) => ({ values: [...l.values].reverse() })),
      300,
      200,
    );
    expect(a).toHaveLength(3);
    const box = a[0]!.computeTightBounds();
    // The tallest step (14) fills the plot, centred on y = 100.
    expect(box.y).toBeGreaterThanOrEqual(5);
    expect(a[0]!.isInterpolatable(b[0]!)).toBe(true);
  });
});

describe('StreamGraph', () => {
  it('describes every layer and shows the total', async () => {
    await render(<StreamGraph accessibilityLabel="Listening by genre" layers={LAYERS} />);
    expect(
      screen.getByRole('image', { name: 'Listening by genre. Pop 23, Jazz 9, Folk 10' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.getByText('42')).toBeOnTheScreen();
  });

  it('isolates a layer from its key and lets it go again', async () => {
    await render(<StreamGraph accessibilityLabel="Listening" layers={LAYERS} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Jazz, 9' }));
    expect(screen.getByRole('button', { name: 'Jazz, 9' })).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getAllByText('Jazz')).toHaveLength(2);
    expect(screen.getByText('9  21%')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Jazz, 9' }));
    expect(screen.getByText('All')).toBeOnTheScreen();
  });

  it('morphs to new data', async () => {
    const { rerender } = await render(
      <StreamGraph accessibilityLabel="Listening" layers={LAYERS} />,
    );
    await act(async () => {
      fireEvent(screen.getByRole('image'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
      });
    });
    await rerender(
      <StreamGraph
        accessibilityLabel="Listening"
        layers={LAYERS.map((l) => ({ ...l, values: l.values.map((v) => v * 2) }))}
      />,
    );
    expect(screen.getByText('84')).toBeOnTheScreen();
  });
});
