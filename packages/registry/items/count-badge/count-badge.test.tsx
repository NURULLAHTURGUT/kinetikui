import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { badgeText, CountBadge } from './count-badge';

describe('badgeText', () => {
  it('caps the number', () => {
    expect(badgeText(7)).toBe('7');
    expect(badgeText(120)).toBe('99+');
    expect(badgeText(12, 9)).toBe('9+');
    expect(badgeText(-3)).toBe('0');
  });
});

describe('CountBadge', () => {
  it('reads the count with its label', async () => {
    await render(
      <CountBadge count={3} formatLabel={(n) => `${n} unread`}>
        <Text>Inbox</Text>
      </CountBadge>,
    );
    expect(screen.getByLabelText('3 unread')).toBeOnTheScreen();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
  });

  it('updates as the count changes and hides at zero', async () => {
    const { rerender } = await render(
      <CountBadge count={9}>
        <Text>Inbox</Text>
      </CountBadge>,
    );
    await rerender(
      <CountBadge count={10}>
        <Text>Inbox</Text>
      </CountBadge>,
    );
    expect(screen.getByLabelText('10 new')).toBeOnTheScreen();
    await rerender(
      <CountBadge count={0}>
        <Text>Inbox</Text>
      </CountBadge>,
    );
    expect(screen.queryByLabelText(/new$/)).toBeNull();
  });
});
