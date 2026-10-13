import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { ActionSheet } from './action-sheet';

function Harness({ onShare, onDelete }: { onShare?: jest.Mock; onDelete?: jest.Mock }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>More</Text>
      </Pressable>
      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Sunset at the pier.jpg"
        actions={[
          { label: 'Share', onPress: onShare ?? (() => {}) },
          { label: 'Duplicate', onPress: () => {}, disabled: true },
          { label: 'Delete photo', tone: 'danger', onPress: onDelete ?? (() => {}) },
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

describe('ActionSheet', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lists its actions under a heading, with Cancel', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('header', { name: 'Sunset at the pier.jpg' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete photo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });

  it('runs a chosen action once the sheet has gone', async () => {
    const onDelete = jest.fn();
    await render(<Harness onDelete={onDelete} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete photo' }));
    expect(onDelete).not.toHaveBeenCalled();
    await settle();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Delete photo' })).toBeNull();
  });

  it('closes on Cancel without running anything', async () => {
    const onShare = jest.fn();
    await render(<Harness onShare={onShare} />);
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await settle();
    expect(onShare).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });
});
