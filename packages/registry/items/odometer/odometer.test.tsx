import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Odometer } from './odometer';

/** Columns render after the line height is measured. */
async function measure() {
  const probe = screen.getAllByText('8', { includeHiddenElements: true })[0]!;
  await act(async () => {
    fireEvent(probe, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 20, height: 40 } } });
  });
}

describe('Odometer', () => {
  it('exposes the formatted value as one text element', async () => {
    await render(<Odometer value={1234.5} decimals={2} locale="en-US" prefix="$" />);
    expect(screen.getByRole('text', { name: '$1,234.50' })).toBeOnTheScreen();
  });

  it('renders one rolling column per digit and static separators', async () => {
    await render(<Odometer value={1234} locale="en-US" />);
    await measure();
    // Each digit column holds a 0–9 strip twice over.
    expect(screen.getAllByText('0', { includeHiddenElements: true }).length).toBeGreaterThanOrEqual(
      8,
    );
    expect(screen.getByText(',', { includeHiddenElements: true })).toBeTruthy();
  });

  it('updates the accessible value when the number changes', async () => {
    const { rerender } = await render(<Odometer value={9} />);
    await rerender(<Odometer value={10} />);
    expect(screen.getByRole('text', { name: '10' })).toBeOnTheScreen();
  });

  it('supports a custom formatter and suffix', async () => {
    await render(<Odometer value={42} format={(v) => v.toFixed(1)} suffix=" km" />);
    expect(screen.getByRole('text', { name: '42.0 km' })).toBeOnTheScreen();
  });

  it('only announces changes when asked', async () => {
    const { rerender } = await render(<Odometer value={1} />);
    expect(screen.getByLabelText('1').props.accessibilityLiveRegion).toBe('none');
    await rerender(<Odometer value={1} announce />);
    expect(screen.getByLabelText('1').props.accessibilityLiveRegion).toBe('polite');
  });

  it('accepts text styles', async () => {
    await render(
      <>
        <Odometer value={5} style={{ fontSize: 12 }} />
        <Text>after</Text>
      </>,
    );
    expect(screen.getByText('after')).toBeOnTheScreen();
  });
});
