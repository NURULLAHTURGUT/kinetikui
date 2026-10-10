import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ShineText } from './shine-text';

describe('ShineText', () => {
  it('exposes the text as one accessible element', async () => {
    await render(<ShineText text="Unlock Pro" />);
    expect(screen.getByLabelText('Unlock Pro')).toBeOnTheScreen();
  });

  it('falls back to plain text without a Skia font', async () => {
    // The Jest Skia mock has no font manager, so matchFont returns nothing.
    await render(<ShineText text="Fallback" />);
    expect(screen.getByText('Fallback')).toBeOnTheScreen();
  });

  it('renders under reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <ShineText text="Still" />
      </KinetikProvider>,
    );
    expect(screen.getByLabelText('Still')).toBeOnTheScreen();
  });

  it('uses a CSS gradient on the web', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      const { toJSON } = await render(<ShineText text="Web" />);
      expect(JSON.stringify(toJSON())).toContain('backgroundClip');
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});
