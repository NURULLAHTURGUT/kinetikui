import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { NoticeBar } from './notice-bar';

const MESSAGES = [
  { text: 'Free shipping on orders over $50', action: { label: 'Shop', onPress: jest.fn() } },
  { text: 'New: gift cards in any amount' },
];

describe('NoticeBar', () => {
  afterEach(() => jest.useRealTimers());

  it('shows the first message and its action', async () => {
    await render(<NoticeBar messages={MESSAGES} />);
    expect(screen.getByText('Free shipping on orders over $50')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Shop' }));
    expect(MESSAGES[0]!.action!.onPress).toHaveBeenCalled();
  });

  it('turns to the next message after the interval', async () => {
    jest.useFakeTimers();
    await render(<NoticeBar messages={MESSAGES} interval={3000} />);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('New: gift cards in any amount')).toBeOnTheScreen();
  });

  it('folds away when dismissed', async () => {
    const onDismiss = jest.fn();
    await render(
      <KinetikProvider reduceMotion="always">
        <NoticeBar messages={MESSAGES} onDismiss={onDismiss} />
      </KinetikProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Free shipping on orders over $50')).toBeNull();
  });
});
