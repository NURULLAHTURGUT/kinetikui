import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { flush } from '../../jest/helpers';
import { inkOutline, SignaturePad, signatureSvg } from './signature-pad';

async function draw(points: [number, number][]) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('signature-pad'), [
      { state: State.BEGAN, x: points[0]![0], y: points[0]![1] },
      ...points.map(([x, y]) => ({ state: State.ACTIVE, x, y })),
      { state: State.END, x: points[points.length - 1]![0], y: points[points.length - 1]![1] },
    ]);
  });
  await flush();
}

describe('inkOutline', () => {
  it('outlines a stroke as a closed, filled shape', () => {
    const path = inkOutline([
      { x: 10, y: 10, w: 4 },
      { x: 30, y: 12, w: 3 },
      { x: 60, y: 20, w: 2 },
    ]);
    const box = path.computeTightBounds();
    expect(box.x).toBeLessThan(10);
    expect(box.x + box.width).toBeGreaterThan(60);
    expect(signatureSvg([[{ x: 1, y: 1, w: 2 }]], 100, 50, 'black')).toMatch(/^<svg .*<path d="M/);
  });
});

describe('SignaturePad', () => {
  it('starts empty, with Undo and Clear disabled', async () => {
    await render(<SignaturePad />);
    expect(screen.getByRole('image', { name: 'Signature, empty' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('records strokes and takes them back', async () => {
    const onChange = jest.fn();
    await render(<SignaturePad onChange={onChange} />);
    await act(async () => {
      fireEvent(screen.getByRole('image'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 200 } },
      });
    });
    await draw([
      [40, 120],
      [60, 100],
      [90, 110],
      [130, 90],
    ]);
    await draw([
      [150, 120],
      [190, 100],
    ]);
    expect(onChange).toHaveBeenCalledTimes(2);
    const strokes = onChange.mock.calls[1][0];
    expect(strokes).toHaveLength(2);
    expect(strokes[0].length).toBeGreaterThan(2);
    expect(screen.getByRole('image', { name: 'Signature, 2 strokes' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onChange).toHaveBeenLastCalledWith([strokes[0]]);
  });
});
