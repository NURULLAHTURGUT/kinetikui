import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { PopDialog } from './pop-dialog';

function Harness({ onDelete, dismissable }: { onDelete?: jest.Mock; dismissable?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Delete project</Text>
      </Pressable>
      <PopDialog
        visible={open}
        onClose={() => setOpen(false)}
        dismissable={dismissable}
        title="Delete this project?"
        message="Its files and history go with it."
        actions={[
          { label: 'Keep it', onPress: () => setOpen(false) },
          {
            label: 'Delete',
            tone: 'danger',
            onPress: () => {
              onDelete?.();
              setOpen(false);
            },
          },
        ]}
      />
    </>
  );
}

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

describe('PopDialog', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens with a heading, message and actions', async () => {
    await render(<Harness />);
    expect(screen.queryByRole('header', { name: 'Delete this project?' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete project' }));
    expect(screen.getByRole('header', { name: 'Delete this project?' })).toBeOnTheScreen();
    expect(screen.getByText('Its files and history go with it.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeOnTheScreen();
  });

  it('runs an action and closes after its exit', async () => {
    const onDelete = jest.fn();
    await render(<Harness onDelete={onDelete} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete project' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
    await settle();
    expect(screen.queryByRole('header', { name: 'Delete this project?' })).toBeNull();
  });

  it('has no outside target when it is not dismissable', async () => {
    await render(<Harness dismissable={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete project' }));
    expect(screen.queryByRole('button', { name: 'Close dialog' })).toBeNull();
  });

  it('closes on a tap outside', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete project' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close dialog' }));
    await settle();
    expect(screen.queryByRole('header', { name: 'Delete this project?' })).toBeNull();
  });
});
