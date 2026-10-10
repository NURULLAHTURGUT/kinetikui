import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { LiquidTabs } from './liquid-tabs';

const tabs = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Bravo' },
  { key: 'c', label: 'Charlie' },
];

function Harness({ onChange }: { onChange?: (k: string) => void }) {
  const [value, setValue] = useState('a');
  return (
    <LiquidTabs
      accessibilityLabel="Feed"
      tabs={tabs}
      value={value}
      onChange={(k) => {
        setValue(k);
        onChange?.(k);
      }}
    />
  );
}

describe('LiquidTabs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes a tab list with a selected tab', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Feed').props.accessibilityRole).toBe('tablist');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Bravo' })).not.toBeSelected();
  });

  it('selects a tab on press with a tick', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Charlie' }));
    });
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('tab', { name: 'Charlie' })).toBeSelected();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('ignores presses on the selected tab', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Alpha' }));
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('draws the indicator once it knows its width', async () => {
    await render(<Harness />);
    await act(async () => {
      fireEvent(screen.getByLabelText('Feed'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 48 } },
      });
    });
    expect(screen.getByRole('tab', { name: 'Alpha' })).toBeOnTheScreen();
  });
});
