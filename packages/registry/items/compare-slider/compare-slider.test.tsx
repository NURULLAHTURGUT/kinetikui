import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { tapGesture } from '../../jest/helpers';
import { CompareSlider } from './compare-slider';

function setup(onPositionChange = jest.fn()) {
  return {
    onPositionChange,
    ui: (
      <CompareSlider
        accessibilityLabel="Colour grade"
        before={<View />}
        after={<View />}
        hint={false}
        onPositionChange={onPositionChange}
      />
    ),
  };
}

describe('CompareSlider', () => {
  it('is adjustable and starts in the middle', async () => {
    const { ui } = setup();
    await render(ui);
    expect(
      screen.getByRole('adjustable', { name: 'Colour grade' }).props.accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 50, text: '50% before' });
  });

  it('moves in tenths with screen reader actions', async () => {
    const { ui, onPositionChange } = setup();
    await render(ui);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(onPositionChange).toHaveBeenLastCalledWith(0.4);
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(40);
  });

  it('jumps to a tap', async () => {
    const { ui, onPositionChange } = setup();
    await render(ui);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 225 } },
      });
    });
    await tapGesture('compare-slider-tap', { x: 225, y: 100 });
    expect(onPositionChange).toHaveBeenLastCalledWith(0.75);
  });
});
