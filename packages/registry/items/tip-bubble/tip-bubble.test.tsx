import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TipBubble } from './tip-bubble';

const TIP = 'Covers payment processing and support around the clock.';

describe('TipBubble', () => {
  afterEach(() => jest.useRealTimers());

  it('opens and closes from its anchor', async () => {
    await render(
      <TipBubble content={TIP} accessibilityLabel="About the service fee">
        <Text>i</Text>
      </TipBubble>,
    );
    const anchor = screen.getByRole('button', { name: 'About the service fee' });
    expect(screen.queryByText(TIP, { includeHiddenElements: true })).toBeNull();
    await fireEvent.press(anchor);
    expect(screen.getByText(TIP, { includeHiddenElements: true })).toBeOnTheScreen();
    expect(anchor).toBeExpanded();
    await fireEvent.press(anchor);
    expect(screen.getByRole('button', { name: 'About the service fee' })).toBeCollapsed();
  });

  it('closes by itself after the duration', async () => {
    jest.useFakeTimers();
    await render(
      <TipBubble content={TIP} accessibilityLabel="About fees" duration={2000}>
        <Text>i</Text>
      </TipBubble>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'About fees' }));
    // The tip closes after the duration, then unmounts once it has faded.
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByText(TIP, { includeHiddenElements: true })).toBeNull();
  });

  it('follows a controlled open state', async () => {
    const onOpenChange = jest.fn();
    await render(
      <TipBubble content={TIP} accessibilityLabel="About fees" open onOpenChange={onOpenChange}>
        <Text>i</Text>
      </TipBubble>,
    );
    expect(screen.getByText(TIP, { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'About fees' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
