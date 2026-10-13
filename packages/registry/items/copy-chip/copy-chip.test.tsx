import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CopyChip } from './copy-chip';

describe('CopyChip', () => {
  afterEach(() => jest.useRealTimers());

  it('names the value it copies', async () => {
    await render(
      <CopyChip label="Install" value="npx kinetik-ui add copy-chip" onCopy={jest.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Copy Install: npx kinetik-ui add copy-chip' }),
    ).toBeOnTheScreen();
  });

  it('copies on press and confirms, then resets', async () => {
    jest.useFakeTimers();
    const onCopy = jest.fn(() => Promise.resolve());
    await render(<CopyChip value="KINETIK-20" onCopy={onCopy} resetAfter={1000} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onCopy).toHaveBeenCalledWith('KINETIK-20');
    expect(screen.getByRole('button')).toHaveAccessibilityValue({ text: 'Copied' });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button').props.accessibilityValue?.text).toBeUndefined();
  });

  it('stays unconfirmed when copying fails', async () => {
    const onCopy = jest.fn(() => Promise.reject(new Error('denied')));
    await render(<CopyChip value="secret" onCopy={onCopy} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('button').props.accessibilityValue?.text).toBeUndefined();
  });
});
