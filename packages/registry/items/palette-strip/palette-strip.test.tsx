import { fireEvent, render, screen } from '@testing-library/react-native';

import { PaletteStrip } from './palette-strip';

const COLORS = ['hsl(0, 0%, 95%)', 'hsl(220, 8%, 38%)', 'hsl(185, 62%, 52%)'];
const NAMES = ['Snow', 'Slate', 'Lagoon'];

describe('PaletteStrip', () => {
  it('is one image named after its colours by default', async () => {
    await render(<PaletteStrip colors={COLORS} names={NAMES} />);
    expect(screen.getByRole('image', { name: 'Palette: Snow, Slate, Lagoon' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('makes each swatch a button when it can be pressed', async () => {
    const onSwatchPress = jest.fn();
    await render(<PaletteStrip colors={COLORS} names={NAMES} onSwatchPress={onSwatchPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Lagoon' }));
    expect(onSwatchPress).toHaveBeenCalledWith(2, 'hsl(185, 62%, 52%)');
  });

  it('runs the shuffle action and takes new colours', async () => {
    const onPress = jest.fn();
    const shuffle = { icon: null, label: 'Shuffle palette', onPress };
    const { rerender } = await render(<PaletteStrip colors={COLORS} action={shuffle} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Shuffle palette' }));
    expect(onPress).toHaveBeenCalled();
    const next = ['hsl(10, 20%, 90%)', 'hsl(30, 20%, 40%)', 'hsl(50, 70%, 50%)'];
    await rerender(<PaletteStrip colors={next} action={shuffle} />);
    expect(screen.getByRole('image', { name: `Palette: ${next.join(', ')}` })).toBeOnTheScreen();
  });
});
