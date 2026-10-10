/**
 * Kinetik design tokens.
 *
 * Every colour, spacing step, radius and shadow used by a Kinetik component
 * comes from this file. Components never hard-code a hex value; they read the
 * active palette through `useKinetikTheme()`.
 *
 * Palette: ink ground, ember accent, ice accent. Dark is the primary theme;
 * light is held to the same bar (contrast is checked in the token tests).
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
  /** Warm primary accent. */
  ember: string;
  /** Ember used for fills behind content (tinted backgrounds). */
  emberSoft: string;
  /** Text and icons placed on an ember fill. */
  onEmber: string;
  /** Cool secondary accent. */
  ice: string;
  /** Ice used for fills behind content. */
  iceSoft: string;
  /** Text and icons placed on an ice fill. */
  onIce: string;
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

const ink = {
  950: '#07080B',
  900: '#0B0D12',
  850: '#10131A',
  800: '#151922',
  700: '#1E2330',
  600: '#2A3142',
  400: '#5F6878',
  300: '#8C95A6',
  200: '#B9C0CC',
  100: '#E4E7ED',
  50: '#F4F5F7',
} as const;

export const palettes: Record<ColorScheme, Palette> = {
  dark: {
    background: ink[900],
    surface: ink[850],
    surfaceRaised: ink[700],
    surfaceSunken: ink[950],
    border: 'rgba(228, 231, 237, 0.08)',
    borderStrong: 'rgba(228, 231, 237, 0.18)',
    text: '#F2F4F8',
    textMuted: ink[300],
    textSubtle: ink[400],
    ember: '#FF6A3D',
    emberSoft: 'rgba(255, 106, 61, 0.14)',
    onEmber: '#1C0A03',
    ice: '#8FD8FF',
    iceSoft: 'rgba(143, 216, 255, 0.12)',
    onIce: '#04131D',
    success: '#5BE49B',
    warning: '#FFC857',
    danger: '#FF6B7A',
    track: 'rgba(228, 231, 237, 0.12)',
    skeleton: ink[800],
    skeletonHighlight: ink[700],
    highlight: '#FFFFFF',
    scrim: 'rgba(7, 8, 11, 0.62)',
  },
  light: {
    background: '#F6F5F2',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#ECEBE6',
    border: 'rgba(11, 13, 18, 0.08)',
    borderStrong: 'rgba(11, 13, 18, 0.18)',
    text: ink[900],
    textMuted: '#525B6B',
    textSubtle: '#7C8494',
    ember: '#F0541F',
    emberSoft: 'rgba(240, 84, 31, 0.10)',
    onEmber: '#1C0A03',
    ice: '#1279B8',
    iceSoft: 'rgba(18, 121, 184, 0.10)',
    onIce: '#FFFFFF',
    success: '#13965A',
    warning: '#B97A00',
    danger: '#D63649',
    track: 'rgba(11, 13, 18, 0.10)',
    skeleton: '#E9E8E3',
    skeletonHighlight: '#F7F6F3',
    highlight: '#FFFFFF',
    scrim: 'rgba(11, 13, 18, 0.36)',
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
