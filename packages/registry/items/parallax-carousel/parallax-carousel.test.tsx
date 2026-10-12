import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { activate, flush } from '../../jest/helpers';
import { ParallaxCarousel } from './parallax-carousel';

const items = [
  { key: 'a', image: { uri: 'https://example.com/a.jpg' }, title: 'Mist Lake', subtitle: 'Canada' },
  {
    key: 'b',
    image: { uri: 'https://example.com/b.jpg' },
    title: 'White Sands',
    subtitle: 'New Mexico',
  },
  {
    key: 'c',
    image: { uri: 'https://example.com/c.jpg' },
    title: 'Snow Ridge',
    subtitle: 'Colorado',
  },
];

async function renderCarousel(props: Partial<Parameters<typeof ParallaxCarousel>[0]> = {}) {
  const utils = await render(<ParallaxCarousel items={items} {...props} testID="carousel" />);
  await act(async () => {
    fireEvent(screen.getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 500 } },
    });
  });
  return utils;
}

describe('ParallaxCarousel', () => {
  it('shows each card with its title, the first one selected', async () => {
    await renderCarousel();
    expect(screen.getByRole('image', { name: 'Mist Lake' })).toBeSelected();
    expect(screen.getByText('New Mexico')).toBeOnTheScreen();
  });

  it('moves to the next card on a swipe', async () => {
    const onIndexChange = jest.fn();
    await renderCarousel({ onIndexChange });
    await act(async () => {
      fireGestureHandler(getByGestureTestId('parallax-carousel'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -60, velocityX: -300 },
        { state: State.ACTIVE, translationX: -140, velocityX: -600 },
        { state: State.END, translationX: -140, velocityX: -600 },
      ]);
    });
    await flush();
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('presses cards and steps through them for screen readers', async () => {
    const onPress = jest.fn();
    const onIndexChange = jest.fn();
    await renderCarousel({ onPress, onIndexChange });
    await activate(screen.getByRole('button', { name: 'Mist Lake' }));
    expect(onPress).toHaveBeenCalledWith(items[0], 0);
    await act(async () => {
      fireEvent(screen.getByRole('button', { name: 'Mist Lake' }), 'accessibilityAction', {
        nativeEvent: { actionName: 'next' },
      });
    });
    await flush();
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });
});
