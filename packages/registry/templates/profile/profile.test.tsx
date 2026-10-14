import { fireEvent, render, screen } from '@testing-library/react-native';

import { activate } from '../../jest/helpers';

import { Profile, compactCount } from './profile';

describe('compactCount', () => {
  it('keeps small numbers and shortens large ones', () => {
    expect(compactCount(312)).toBe('312');
    expect(compactCount(9999)).toBe('9,999');
    expect(compactCount(24817)).toBe('24.8k');
    expect(compactCount(250000)).toBe('250k');
    expect(compactCount(1200000)).toBe('1.2M');
  });
});

describe('Profile', () => {
  it('shows the user, stats and plan', async () => {
    await render(
      <Profile
        user={{ name: 'Ada Lovelace', handle: '@ada' }}
        stats={[{ label: 'Followers', value: 24817 }]}
        plan={{ title: 'Kinetik Pro', detail: 'Renews on 3 March' }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Ada Lovelace' })).toBeOnTheScreen();
    expect(screen.getByText('AL', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('24.8k Followers')).toBeOnTheScreen();
    expect(screen.getByLabelText('Kinetik Pro, Renews on 3 March')).toBeOnTheScreen();
  });

  it('runs row actions and switches', async () => {
    const onPress = jest.fn();
    const onValueChange = jest.fn();
    const onSignOut = jest.fn();
    await render(
      <Profile
        user={{ name: 'Ada' }}
        onSignOut={onSignOut}
        sections={[
          {
            title: 'Account',
            rows: [
              { key: 'info', label: 'Personal info', onPress },
              { key: 'push', label: 'Notifications', toggle: { value: false, onValueChange } },
            ],
          },
        ]}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Personal info' }));
    await activate(screen.getByRole('switch', { name: 'Notifications' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(onPress).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(onSignOut).toHaveBeenCalled();
  });

  it('shows Edit profile only with a handler', async () => {
    const onEdit = jest.fn();
    const { rerender } = await render(<Profile user={{ name: 'Ada' }} />);
    expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
    await rerender(<Profile user={{ name: 'Ada' }} onEdit={onEdit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(onEdit).toHaveBeenCalled();
  });
});
