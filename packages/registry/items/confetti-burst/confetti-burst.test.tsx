import { act, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { createRef } from 'react';
import { Text } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ConfettiBurst, type ConfettiHandle } from './confetti-burst';

describe('ConfettiBurst', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders its children', async () => {
    await render(
      <ConfettiBurst>
        <Text>Shipped</Text>
      </ConfettiBurst>,
    );
    expect(screen.getByText('Shipped')).toBeOnTheScreen();
  });

  it('bursts from the handle with a success haptic', async () => {
    const ref = createRef<ConfettiHandle>();
    await render(<ConfettiBurst ref={ref} count={500} />);
    await act(async () => ref.current?.burst({ x: 10, y: 10 }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('bursts when trigger changes, not on mount', async () => {
    const { rerender } = await render(<ConfettiBurst trigger={0} />);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    await rerender(<ConfettiBurst trigger={1} />);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the haptic but skips particles under reduced motion', async () => {
    const ref = createRef<ConfettiHandle>();
    await render(
      <KinetikProvider reduceMotion="always">
        <ConfettiBurst ref={ref} />
      </KinetikProvider>,
    );
    await act(async () => ref.current?.burst());
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});
