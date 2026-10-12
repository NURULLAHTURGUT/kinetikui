import { palettes, withAlpha, type ColorScheme } from './tokens';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each<ColorScheme>(['dark', 'light'])('%s palette', (scheme) => {
  const p = palettes[scheme];

  it.each([
    ['text on background', p.text, p.background, 7],
    ['text on surface', p.text, p.surface, 7],
    ['textMuted on background', p.textMuted, p.background, 4.5],
    ['textMuted on surface', p.textMuted, p.surface, 4.5],
    ['textSubtle on surface', p.textSubtle, p.surface, 3],
    ['onEmber on ember', p.onEmber, p.ember, 4.5],
    ['onIce on ice', p.onIce, p.ice, 4.5],
    ['onAzure on azure', p.onAzure, p.azure, 4.5],
    ['azure on background (large / UI)', p.azure, p.background, 3],
    ['sky on background (large / UI)', p.sky, p.background, 3],
    ['ember on background (large / UI)', p.ember, p.background, 3],
    ['ice on background (large / UI)', p.ice, p.background, 3],
  ])('%s', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('defines every palette key in both schemes', () => {
    expect(Object.keys(p).sort()).toEqual(Object.keys(palettes.dark).sort());
  });
});

describe('withAlpha', () => {
  it('converts hex to rgba', () => {
    expect(withAlpha('#FF6A3D', 0.5)).toBe('rgba(255, 106, 61, 0.5)');
  });
  it('clamps alpha', () => {
    expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
  });
  it('passes through non-hex colours', () => {
    expect(withAlpha('rgba(1, 2, 3, 0.4)', 0.5)).toBe('rgba(1, 2, 3, 0.4)');
  });
});
