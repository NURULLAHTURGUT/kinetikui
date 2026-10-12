import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerSheet, type Track } from './player-sheet';

const press = (fn: () => void) =>
  act(async () => {
    fn();
  });

const tracks: Track[] = [
  { id: 'a', title: 'First Song', artist: 'Band', duration: 120 },
  { id: 'b', title: 'Second Song', artist: 'Band', duration: 95 },
];

describe('PlayerSheet', () => {
  it('lists tracks and plays the one pressed', async () => {
    const onPlay = jest.fn();
    await render(<PlayerSheet tracks={tracks} onPlay={onPlay} />);
    expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();
    await press(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Second Song by Band, 1:35' })),
    );
    expect(onPlay).toHaveBeenCalledWith(tracks[1]);
    expect(screen.getByRole('button', { name: 'Second Song by Band, 1:35' })).toBeSelected();
    expect(
      screen.getByRole('button', { name: 'Now playing: Second Song by Band' }),
    ).toBeOnTheScreen();
  });

  it('toggles play and pause from the mini player', async () => {
    const onPlay = jest.fn();
    const onPause = jest.fn();
    await render(<PlayerSheet tracks={tracks} onPlay={onPlay} onPause={onPause} />);
    await press(() => fireEvent.press(screen.getAllByRole('button', { name: 'Play' })[0]!));
    expect(onPlay).toHaveBeenCalledWith(tracks[0]);
    await press(() => fireEvent.press(screen.getAllByRole('button', { name: 'Pause' })[0]!));
    expect(onPause).toHaveBeenCalled();
  });

  it('opens the player and skips to the next track', async () => {
    const onPlay = jest.fn();
    await render(<PlayerSheet tracks={tracks} onPlay={onPlay} />);
    await press(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Now playing: First Song by Band' })),
    );
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Next track' })));
    expect(onPlay).toHaveBeenLastCalledWith(tracks[1]);
  });
});
