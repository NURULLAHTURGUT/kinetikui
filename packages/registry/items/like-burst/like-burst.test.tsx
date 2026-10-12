import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { LikeBurst, compactCount } from './like-burst';

const state = () => screen.getByRole('togglebutton', { name: 'Like' }).props;

describe('LikeBurst', () => {
  beforeEach(() => jest.clearAllMocks());

  it('likes, adds the viewer to the count and unlikes', async () => {
    const onLikedChange = jest.fn();
    await render(<LikeBurst count={41} onLikedChange={onLikedChange} />);
    expect(state().accessibilityState.checked).toBe(false);
    expect(state().accessibilityValue).toEqual({ text: '41' });

    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Like' }));
    expect(onLikedChange).toHaveBeenLastCalledWith(true);
    expect(state().accessibilityState.checked).toBe(true);
    expect(state().accessibilityValue).toEqual({ text: '42' });
    // The visible count is hidden from screen readers, which read the value instead.
    expect(screen.getByText('42', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Like' }));
    expect(onLikedChange).toHaveBeenLastCalledWith(false);
    expect(state().accessibilityValue).toEqual({ text: '41' });
    // No haptic for taking a like back.
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('stays controlled', async () => {
    const onLikedChange = jest.fn();
    await render(<LikeBurst liked count={9} onLikedChange={onLikedChange} />);
    expect(state().accessibilityValue).toEqual({ text: '10' });
    await fireEvent.press(screen.getByRole('togglebutton', { name: 'Like' }));
    expect(onLikedChange).toHaveBeenLastCalledWith(false);
    expect(state().accessibilityState.checked).toBe(true);
  });

  it('hides the count when none is given', async () => {
    await render(<LikeBurst accessibilityLabel="Like" />);
    expect(state().accessibilityValue?.text).toBeUndefined();
  });
});

describe('compactCount', () => {
  it.each([
    [980, '980'],
    [1000, '1K'],
    [1250, '1.2K'],
    [24_900, '24K'],
    [3_160_000, '3.1M'],
  ])('%d → %s', (n, out) => {
    expect(compactCount(n)).toBe(out);
  });
});
