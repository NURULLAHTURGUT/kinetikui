import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { VinylPlayer } from './vinyl-player';

const TRACKS = [
  { id: 'a', title: 'Blue Hour', artist: 'Paper Lanterns', cover: { uri: 'a.jpg' }, duration: 214 },
  { id: 'b', title: 'Pastel Tide', artist: 'Mara Ellis', cover: { uri: 'b.jpg' }, duration: 192 },
];

describe('VinylPlayer', () => {
  it('reads the track and the position', async () => {
    await render(<VinylPlayer tracks={TRACKS} />);
    expect(screen.getByLabelText('Blue Hour, Paper Lanterns')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Playback position' })).toHaveAccessibilityValue({
      text: '0:00 of 3:34',
    });
  });

  it('plays, pauses and skips', async () => {
    const onPlayingChange = jest.fn();
    const onTrackChange = jest.fn();
    await render(
      <VinylPlayer
        tracks={TRACKS}
        onPlayingChange={onPlayingChange}
        onTrackChange={onTrackChange}
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    });
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    });
    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[1]);
    expect(screen.getByLabelText('Pastel Tide, Mara Ellis')).toBeOnTheScreen();
  });

  it('mutes only when asked to', async () => {
    const { rerender } = await render(<VinylPlayer tracks={TRACKS} />);
    expect(screen.queryByRole('switch', { name: 'Mute' })).toBeNull();
    const onMutedChange = jest.fn();
    await rerender(<VinylPlayer tracks={TRACKS} onMutedChange={onMutedChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('switch', { name: 'Mute' }));
    });
    expect(onMutedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Mute' })).toBeChecked();
  });
});
