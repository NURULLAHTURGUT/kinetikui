import { fireEvent, render, screen } from '@testing-library/react-native';

import { MorphIcon } from './morph-icon';

describe('MorphIcon', () => {
  it('toggles its own state when uncontrolled', async () => {
    const onValueChange = jest.fn();
    await render(
      <MorphIcon pair="menu-close" accessibilityLabel="Menu" onValueChange={onValueChange} />,
    );
    const checked = () =>
      screen.getByRole('togglebutton', { name: 'Menu' }).props.accessibilityState.checked;
    expect(checked()).toBe(false);
    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Menu' }));
    expect(onValueChange).toHaveBeenLastCalledWith(true);
    expect(checked()).toBe(true);
  });

  it('follows a controlled value', async () => {
    const onValueChange = jest.fn();
    const { rerender } = await render(
      <MorphIcon
        pair="play-pause"
        value={false}
        onValueChange={onValueChange}
        accessibilityLabel="Play"
        activeAccessibilityLabel="Pause"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(onValueChange).toHaveBeenLastCalledWith(true);
    // Still controlled: nothing changes until the parent says so.
    expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
    await rerender(
      <MorphIcon
        pair="play-pause"
        value
        accessibilityLabel="Play"
        activeAccessibilityLabel="Pause"
      />,
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });

  it('ignores presses while disabled', async () => {
    const onValueChange = jest.fn();
    await render(
      <MorphIcon
        pair="plus-check"
        accessibilityLabel="Add to library"
        disabled
        onValueChange={onValueChange}
      />,
    );
    await fireEvent.press(screen.getByRole('togglebutton'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('makes up a 44 pt target for small sizes', async () => {
    await render(<MorphIcon pair="plus-close" size={32} accessibilityLabel="Add" />);
    expect(screen.getByRole('togglebutton').props.hitSlop).toBe(6);
  });
});
