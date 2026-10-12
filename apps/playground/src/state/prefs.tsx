import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type SchemePref = 'system' | 'dark' | 'light';

type Prefs = {
  scheme: SchemePref;
  setScheme: (s: SchemePref) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  haptics: boolean;
  setHaptics: (v: boolean) => void;
};

const PrefsContext = createContext<Prefs | null>(null);

/** Playground-wide preview preferences (theme, reduced motion, haptics). */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<SchemePref>('system');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const value = useMemo(
    () => ({ scheme, setScheme, reduceMotion, setReduceMotion, haptics, setHaptics }),
    [scheme, reduceMotion, haptics],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const prefs = useContext(PrefsContext);
  if (!prefs) throw new Error('usePrefs must be used inside PrefsProvider');
  return prefs;
}
