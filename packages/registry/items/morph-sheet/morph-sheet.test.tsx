import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { MorphSheet } from './morph-sheet';

function Harness({
  initial = false,
  onOpenChange,
}: {
  initial?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <MorphSheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
      accessibilityLabel="Share"
      sheet={<Text>Sheet body</Text>}
    >
      <Text>Screen</Text>
    </MorphSheet>
  );
}

describe('MorphSheet', () => {
  it('shows the screen and keeps a closed sheet away from screen readers', async () => {
    await render(<Harness />);
    expect(screen.getByText('Screen')).toBeOnTheScreen();
    expect(screen.queryByText('Sheet body')).toBeNull();
  });

  it('hides the screen behind an open sheet', async () => {
    await render(<Harness initial />);
    expect(screen.getByText('Sheet body')).toBeOnTheScreen();
    expect(screen.queryByText('Screen')).toBeNull();
  });

  it('closes from the scrim (a touch target; screen readers use escape instead)', async () => {
    const onOpenChange = jest.fn();
    await render(<Harness initial onOpenChange={onOpenChange} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Close sheet', { includeHiddenElements: true }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes from the screen-reader escape action', async () => {
    const onOpenChange = jest.fn();
    await render(<Harness initial onOpenChange={onOpenChange} />);
    await act(async () => {
      fireEvent(screen.getByLabelText('Share'), 'accessibilityAction', {
        nativeEvent: { actionName: 'escape' },
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
