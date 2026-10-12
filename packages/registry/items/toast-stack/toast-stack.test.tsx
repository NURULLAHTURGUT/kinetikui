import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';

import { ToastProvider, useToast, type ToastOptions } from './toast-stack';

type Api = ReturnType<typeof useToast>;
const handle: { api: Api | null } = { api: null };
function Capture({ onApi }: { onApi: (api: Api) => void }) {
  const api = useToast();
  useEffect(() => onApi(api), [api, onApi]);
  return null;
}
const keep = (api: Api) => {
  handle.api = api;
};

async function setup(props: Partial<Parameters<typeof ToastProvider>[0]> = {}) {
  await render(
    <ToastProvider {...props}>
      <Capture onApi={keep} />
    </ToastProvider>,
  );
}

async function show(options: ToastOptions) {
  let id = 0;
  await act(async () => {
    id = handle.api!.show(options);
  });
  return id;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  it('shows a toast as an alert and announces it', async () => {
    await setup();
    await show({ title: 'Saved', description: 'All changes synced.' });
    expect(screen.getByRole('alert', { name: 'Saved. All changes synced.' })).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Saved. All changes synced.',
    );
  });

  it('plays the haptic that matches the tone', async () => {
    await setup();
    await show({ title: 'Failed', tone: 'danger' });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    await show({ title: 'Plain' });
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('runs the action and dismisses the toast', async () => {
    await setup();
    const onPress = jest.fn();
    await show({ title: 'Card removed', action: { label: 'Undo', onPress } });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dismisses from the screen-reader dismiss action', async () => {
    await setup();
    await show({ title: 'Hello' });
    await act(async () => {
      fireEvent(screen.getByRole('alert'), 'accessibilityAction', {
        nativeEvent: { actionName: 'dismiss' },
      });
    });
    // Leaving toasts animate out; the mocked animation completes immediately.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.queryByRole('alert', { name: 'Hello' })).toBeNull();
  });

  it('auto-dismisses after its duration', async () => {
    jest.useFakeTimers();
    await setup({ duration: 1000 });
    await show({ title: 'Brief' });
    expect(screen.getByRole('alert', { name: 'Brief' })).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.queryByRole('alert', { name: 'Brief' })).toBeNull();
    jest.useRealTimers();
  });

  it('keeps toasts with duration null', async () => {
    jest.useFakeTimers();
    await setup({ duration: 1000 });
    await show({ title: 'Sticky', duration: null });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('alert', { name: 'Sticky' })).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('throws a helpful error outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useToast();
      return (
        <Pressable>
          <Text>x</Text>
        </Pressable>
      );
    }
    await expect(render(<Orphan />)).rejects.toThrow(
      'useToast must be used inside <ToastProvider>',
    );
    spy.mockRestore();
  });
});
