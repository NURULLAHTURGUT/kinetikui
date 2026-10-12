import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { StoryCard, type Story } from './story-card';

const stories: Story[] = [
  { key: 'a', image: { uri: 'a.jpg' }, title: 'Dunes' },
  { key: 'b', image: { uri: 'b.jpg' }, title: 'Oasis' },
  { key: 'c', image: { uri: 'c.jpg' }, title: 'Night' },
];

const card = () => screen.getByRole('adjustable');
const tapAt = async (locationX: number) => {
  await fireEvent.press(card(), { nativeEvent: { locationX } });
};

describe('StoryCard', () => {
  it('steps forward on the right and back on the left', async () => {
    const onIndexChange = jest.fn();
    await render(
      <StoryCard testID="story" stories={stories} onIndexChange={onIndexChange} paused />,
    );
    await fireEvent(screen.getByTestId('story'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 450 } },
    });
    expect(card().props.accessibilityValue).toEqual({ text: 'Story 1 of 3' });

    await tapAt(250);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole('adjustable', { name: 'Oasis' })).toBeOnTheScreen();

    await tapAt(20);
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it('moves with the screen reader adjust actions', async () => {
    await render(<StoryCard stories={stories} paused />);
    await act(async () => {
      fireEvent(card(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(card().props.accessibilityValue).toEqual({ text: 'Story 2 of 3' });
    await act(async () => {
      fireEvent(card(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(card().props.accessibilityValue).toEqual({ text: 'Story 1 of 3' });
  });

  it('loops past the last story, or ends without loop', async () => {
    const onEnd = jest.fn();
    const { rerender } = await render(<StoryCard stories={stories} initialIndex={2} paused />);
    await act(async () => {
      fireEvent(card(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(card().props.accessibilityValue).toEqual({ text: 'Story 1 of 3' });

    await rerender(
      <StoryCard key="once" stories={stories} initialIndex={2} loop={false} onEnd={onEnd} paused />,
    );
    await act(async () => {
      fireEvent(card(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(card().props.accessibilityValue).toEqual({ text: 'Story 3 of 3' });
  });
});
