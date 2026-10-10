import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ProfileHero } from './profile-hero';

const press = (fn: () => void) =>
  act(async () => {
    fn();
  });

describe('ProfileHero', () => {
  it('renders the profile with stats', async () => {
    await render(<ProfileHero />);
    expect(screen.getByRole('header', { name: 'Mira Okafor' })).toBeOnTheScreen();
    expect(screen.getByLabelText('24,816 followers')).toBeOnTheScreen();
  });

  it('follows with a rolling count, a toast and undo', async () => {
    const onFollowChange = jest.fn();
    await render(<ProfileHero onFollowChange={onFollowChange} />);
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Follow Mira' })));
    expect(onFollowChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByLabelText('24,817 followers')).toBeOnTheScreen();
    expect(screen.getByText('Following Mira')).toBeOnTheScreen();
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Undo' })));
    expect(onFollowChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button', { name: 'Follow Mira' })).toBeOnTheScreen();
  });

  it('shows skeletons while a tab loads', async () => {
    let finish: () => void = () => {};
    const loadTab = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await render(<ProfileHero loadTab={loadTab} />);
    expect(screen.getByLabelText('Loading posts')).toBeOnTheScreen();
    await act(async () => finish());
    expect(screen.queryByLabelText('Loading posts')).toBeNull();
    expect(screen.getByLabelText('Post 1')).toBeOnTheScreen();

    await press(() => fireEvent.press(screen.getByRole('tab', { name: 'About' })));
    expect(loadTab).toHaveBeenLastCalledWith('about');
    expect(screen.getByLabelText('Loading details')).toBeOnTheScreen();
    await act(async () => finish());
    expect(screen.getByText('Lisbon, Portugal')).toBeOnTheScreen();
  });
});
