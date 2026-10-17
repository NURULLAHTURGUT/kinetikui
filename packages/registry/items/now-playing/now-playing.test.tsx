import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { clock, NowPlaying } from './now-playing';

const TRACKS = [
  { id: 'a', title: 'Nocturne', subtitle: 'Sonata No. 2', cover: { uri: 'a.jpg' }, duration: 223 },
  { id: 'b', title: 'Tidewater', subtitle: 'Études, II', cover: { uri: 'b.jpg' }, duration: 187 },
];

describe('clock', () => {
  it('formats elapsed and padded times', () => {
    expect(clock(69)).toBe('1:09');
    expect(clock(154, true)).toBe('02:34');
    expect(clock(-3)).toBe('0:00');
  });
});

describe('NowPlaying', () => {
  it('reads the track and the position', async () => {
    await render(<NowPlaying tracks={TRACKS} />);
    expect(screen.getByLabelText('Nocturne, Sonata No. 2')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Playback position' })).toHaveAccessibilityValue({
      text: '0:00 of 3:43',
    });
  });

  it('plays and pauses', async () => {
    const onPlayingChange = jest.fn();
    await render(<NowPlaying tracks={TRACKS} onPlayingChange={onPlayingChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    });
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    });
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
  });

  it('skips forward and wraps back', async () => {
    const onTrackChange = jest.fn();
    await render(<NowPlaying tracks={TRACKS} onTrackChange={onTrackChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    });
    expect(screen.getByLabelText('Tidewater, Études, II')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    });
    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[0]);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Previous' }));
    });
    expect(screen.getByLabelText('Tidewater, Études, II')).toBeOnTheScreen();
  });

  it('seeks in ten-second steps for screen readers', async () => {
    await render(<NowPlaying tracks={TRACKS} />);
    const bar = screen.getByRole('adjustable', { name: 'Playback position' });
    await act(async () => {
      fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(bar).toHaveAccessibilityValue({ text: '0:10 of 3:43' });
  });

  it('reports seeks in seconds', async () => {
    const onSeek = jest.fn();
    await render(<NowPlaying tracks={TRACKS} onSeek={onSeek} />);
    await act(async () => {
      fireEvent(
        screen.getByRole('adjustable', { name: 'Playback position' }),
        'accessibilityAction',
        {
          nativeEvent: { actionName: 'increment' },
        },
      );
    });
    expect(onSeek).toHaveBeenLastCalledWith(10);
  });

  describe('driven by the app', () => {
    it('follows the position it is given', async () => {
      const onSeek = jest.fn();
      const { rerender } = await render(
        <NowPlaying tracks={TRACKS} playing position={69} onSeek={onSeek} />,
      );
      const bar = screen.getByRole('adjustable', { name: 'Playback position' });
      expect(bar).toHaveAccessibilityValue({ text: '1:09 of 3:43' });
      // A seek asks the app; the readout waits for the engine to report back.
      await act(async () => {
        fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      });
      expect(onSeek).toHaveBeenLastCalledWith(79);
      expect(bar).toHaveAccessibilityValue({ text: '1:09 of 3:43' });
      await rerender(<NowPlaying tracks={TRACKS} playing position={79} onSeek={onSeek} />);
      expect(bar).toHaveAccessibilityValue({ text: '1:19 of 3:43' });
    });

    it('leaves play state and the track to the app', async () => {
      const onPlayingChange = jest.fn();
      const onTrackChange = jest.fn();
      const { rerender } = await render(
        <NowPlaying
          tracks={TRACKS}
          playing={false}
          trackId="a"
          onPlayingChange={onPlayingChange}
          onTrackChange={onTrackChange}
        />,
      );
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Play' }));
      });
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Next' }));
      });
      expect(onPlayingChange).toHaveBeenLastCalledWith(true);
      expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[1]);
      expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
      expect(screen.getByLabelText('Nocturne, Sonata No. 2')).toBeOnTheScreen();
      // A skip from the lock screen arrives as a new trackId.
      await rerender(<NowPlaying tracks={TRACKS} playing trackId="b" />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
      expect(screen.getByLabelText('Tidewater, Études, II')).toBeOnTheScreen();
    });
  });
});
