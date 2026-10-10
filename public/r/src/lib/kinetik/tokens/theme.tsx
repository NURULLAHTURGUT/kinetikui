import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type ColorScheme, type Palette, type Theme } from './tokens';

export type ReduceMotionPreference = 'system' | 'always' | 'never';

export type KinetikConfig = {
  theme: Theme;
  /** Overrides the system reduce-motion setting. */
  reduceMotion: ReduceMotionPreference;
  /** Global haptics switch. Individual components can still opt out. */
  haptics: boolean;
};

const KinetikContext = createContext<KinetikConfig | null>(null);

export type KinetikProviderProps = {
  children: ReactNode;
  /** `system` follows the OS appearance. Defaults to `system`. */
  scheme?: ColorScheme | 'system';
  /** Partial palette overrides, applied on top of the active scheme. */
  colors?: Partial<Palette>;
  /** Defaults to `system`. Use `always` to preview reduced-motion fallbacks. */
  reduceMotion?: ReduceMotionPreference;
  /** Defaults to `true`. */
  haptics?: boolean;
};

/**
 * Optional root provider. Kinetik components work without it (they follow the
 * system appearance with default tokens); add it to force a scheme, brand the
 * palette, or control motion and haptics app-wide.
 */
export function KinetikProvider({
  children,
  scheme = 'system',
  colors,
  reduceMotion = 'system',
  haptics = true,
}: KinetikProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme =
    scheme === 'system' ? (system === 'light' ? 'light' : 'dark') : scheme;

  const value = useMemo<KinetikConfig>(
    () => ({ theme: createTheme(resolved, colors), reduceMotion, haptics }),
    [resolved, colors, reduceMotion, haptics],
  );

  return <KinetikContext.Provider value={value}>{children}</KinetikContext.Provider>;
}

const fallbackThemes: Record<ColorScheme, Theme> = {
  dark: createTheme('dark'),
  light: createTheme('light'),
};

/** Full Kinetik configuration: theme plus motion and haptics preferences. */
export function useKinetikConfig(): KinetikConfig {
  const config = useContext(KinetikContext);
  const system = useColorScheme();
  if (config) return config;
  return {
    theme: fallbackThemes[system === 'light' ? 'light' : 'dark'],
    reduceMotion: 'system',
    haptics: true,
  };
}

/** The active theme (colours, spacing, radius, type, shadows). */
export function useKinetikTheme(): Theme {
  return useKinetikConfig().theme;
}
