import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { tapGesture } from '../../jest/helpers';
import { StarRating } from './star-rating';

function Harness({ allowHalf = false, initial = 0 }: { allowHalf?: boolean; initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <StarRating
      accessibilityLabel="Your rating"
      value={value}
      onValueChange={setValue}
      allowHalf={allowHalf}
      size={32}
    />
  );
}

const now = () => screen.getByRole('adjustable').props.accessibilityValue.now;

describe('StarRating', () => {
  it('is adjustable and reads its value', async () => {
    await render(<Harness initial={3} />);
    expect(
      screen.getByRole('adjustable', { name: 'Your rating' }).props.accessibilityValue,
    ).toEqual({ min: 0, max: 5, now: 3, text: '3 of 5 stars' });
  });

  it('rates the star that is tapped, and clears on a second tap', async () => {
    await render(<Harness />);
    // Stars are 32 pt with a 7 pt gap: x = 100 is inside the third.
    await tapGesture('star-rating-tap', { x: 100, y: 16 });
    expect(now()).toBe(3);
    await tapGesture('star-rating-tap', { x: 100, y: 16 });
    expect(now()).toBe(0);
  });

  it('rates half stars when allowed', async () => {
    await render(<Harness allowHalf />);
    await tapGesture('star-rating-tap', { x: 80, y: 16 });
    expect(now()).toBe(2.5);
  });

  it('steps with screen reader actions', async () => {
    await render(<Harness initial={2} />);
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(now()).toBe(1);
  });

  it('is an image with a spoken value when read-only', async () => {
    await render(<StarRating value={4.5} allowHalf />);
    expect(screen.getByRole('image', { name: 'Rating: 4.5 of 5 stars' })).toBeOnTheScreen();
  });
});
