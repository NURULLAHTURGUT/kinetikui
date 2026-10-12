/**
 * Kinetik design tokens.
 *
 * Every colour, spacing step, radius and shadow used by a Kinetik component
 * comes from this file. Components never hard-code a hex value; they read the
 * active palette through `useKinetikTheme()`.
 *
 * Palette: monochrome with one blue. Black and white grounds, the primary
 * accent (`ember`) is the strongest ink and the secondary accent (`ice`) a mid
 * grey. `azure` is a single blue for the few places that want colour: charts,
 * selection, a highlighted action. Status colours keep their hue because they
 * carry meaning. Brand it by overriding `ember` / `ice` / `azure` on the
 * provider. Dark is the primary theme; light is held to
 * the same bar (contrast is checked in the token tests).
 */

export type ColorScheme = 'dark' | 'light';

export type Palette = {
  /** App ground. */
  background: string;
  /** Cards, sheets, grouped rows. */
  surface: string;
  /** Elements that sit on top of a surface (thumbs, chips, popovers). */
  surfaceRaised: string;
  /** Pressed / sunken state of a surface. */
  surfaceSunken: string;
  /** Hairlines and outlines. */
  border: string;
  /** A stronger outline for focus and active states. */
  borderStrong: string;
  /** Primary text. */
  text: string;
  /** Secondary text, labels. */
  textMuted: string;
  /** Tertiary text, placeholders, disabled. */
  textSubtle: string;
  /** Primary accent. */
  ember: string;
  /** Ember used for fills behind content (tinted backgrounds). */
  emberSoft: string;
  /** Text and icons placed on an ember fill. */
  onEmber: string;
  /** Secondary accent. */
  ice: string;
  /** Ice used for fills behind content. */
  iceSoft: string;
  /** Text and icons placed on an ice fill. */
  onIce: string;
  /** The blue accent: fills, chart series, selection. */
  azure: string;
  /** Azure used for fills behind content. */
  azureSoft: string;
  /** Text and icons placed on an azure fill. */
  onAzure: string;
  /** A lighter blue for lines, glows and the far end of azure gradients. */
  sky: string;
  success: string;
  warning: string;
  danger: string;
  /** Unfilled part of tracks (sliders, switches). Translucent, so it reads on any surface. */
  track: string;
  /** Skeleton base and shimmer colours. */
  skeleton: string;
  skeletonHighlight: string;
  /** Specular highlight colour for glints and sheens. */
  highlight: string;
  /** Scrim placed behind sheets and dialogs. */
  scrim: string;
};

const grey = {
  1000: '#000000',
  950: '#050505',
  900: '#0A0A0A',
  850: '#141414',
  800: '#1C1C1C',
  400: '#707070',
  300: '#A1A1A1',
  100: '#EDEDED',
  50: '#FAFAFA',
} as const;

export const palettes: Record<ColorScheme, Palette> = {
  dark: {
    background: grey[1000],
    surface: grey[900],
    surfaceRaised: grey[800],
    surfaceSunken: grey[950],
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    text: grey[100],
    textMuted: grey[300],
    textSubtle: grey[400],
    ember: '#FFFFFF',
    emberSoft: 'rgba(255, 255, 255, 0.10)',
    onEmber: '#000000',
    ice: '#A3A3A3',
    iceSoft: 'rgba(255, 255, 255, 0.06)',
    onIce: '#000000',
    azure: '#2B6BEF',
    azureSoft: 'rgba(59, 130, 246, 0.16)',
    onAzure: '#FFFFFF',
    sky: '#7AB2FF',
    success: '#5BE49B',
    warning: '#FFC857',
    danger: '#FF6B7A',
    track: 'rgba(255, 255, 255, 0.12)',
    skeleton: grey[850],
    skeletonHighlight: grey[800],
    highlight: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.62)',
  },
  light: {
    background: '#FFFFFF',
    surface: grey[50],
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#F0F0F0',
    border: 'rgba(0, 0, 0, 0.08)',
    borderStrong: 'rgba(0, 0, 0, 0.16)',
    text: grey[900],
    textMuted: '#555555',
    textSubtle: '#8A8A8A',
    ember: '#000000',
    emberSoft: 'rgba(0, 0, 0, 0.06)',
    onEmber: '#FFFFFF',
    ice: '#6B6B6B',
    iceSoft: 'rgba(0, 0, 0, 0.05)',
    onIce: '#FFFFFF',
    azure: '#1F5FE0',
    azureSoft: 'rgba(31, 95, 224, 0.10)',
    onAzure: '#FFFFFF',
    sky: '#3B82F6',
    success: '#13965A',
    warning: '#B97A00',
    danger: '#D63649',
    track: 'rgba(0, 0, 0, 0.10)',
    skeleton: '#EDEDED',
    skeletonHighlight: '#F7F7F7',
    highlight: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.36)',
  },
};

/** 4 pt spacing scale. */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum hit target in points (WCAG 2.5.8 / Apple HIG). */
export const minTouchTarget = 44;

export const font = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
    '4xl': 48,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.4,
    relaxed: 1.6,
  },
  tracking: {
    tight: -0.4,
    normal: 0,
    wide: 0.6,
  },
} as const;

/**
 * Shadows use the cross-platform `boxShadow` style (New Architecture), so the
 * same token renders on iOS, Android and web.
 */
export const shadows: Record<ColorScheme, Record<'sm' | 'md' | 'lg', string>> = {
  dark: {
    sm: '0px 1px 2px rgba(0, 0, 0, 0.40)',
    md: '0px 8px 24px rgba(0, 0, 0, 0.45)',
    lg: '0px 24px 48px rgba(0, 0, 0, 0.55)',
  },
  light: {
    sm: '0px 1px 2px rgba(11, 13, 18, 0.06)',
    md: '0px 8px 24px rgba(11, 13, 18, 0.08)',
    lg: '0px 24px 48px rgba(11, 13, 18, 0.12)',
  },
};

/** Coloured glow for accent elements. */
export function glow(color: string, strength: 'soft' | 'strong' = 'soft'): string {
  return strength === 'soft'
    ? `0px 6px 20px ${withAlpha(color, 0.35)}`
    : `0px 10px 32px ${withAlpha(color, 0.55)}`;
}

/**
 * Applies an alpha channel to a `#RRGGBB` colour. Other formats are returned
 * unchanged, so callers can pass any token safely. Safe to call from worklets.
 */
export function withAlpha(color: string, alpha: number): string {
  'worklet';
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match?.[1]) return color;
  const n = parseInt(match[1], 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  font: typeof font;
  shadow: (typeof shadows)[ColorScheme];
};

export function createTheme(scheme: ColorScheme, overrides?: Partial<Palette>): Theme {
  return {
    scheme,
    colors: { ...palettes[scheme], ...overrides },
    space,
    radius,
    font,
    shadow: shadows[scheme],
  };
}
