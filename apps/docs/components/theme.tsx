'use client';

import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';

export type SitePreference = 'system' | 'dark' | 'light';
const KEY = 'kinetik-theme';
const listeners = new Set<() => void>();

function readPreference(): SitePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemScheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', cb);
  };
}

export function setPreference(pref: SitePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page.
  }
  if (pref === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', pref);
  listeners.forEach((l) => l());
}

export function usePreference(): SitePreference {
  return useSyncExternalStore(subscribe, readPreference, () => 'system');
}

/** The scheme actually in effect (preference resolved against the OS). */
export function useSiteTheme(): 'dark' | 'light' {
  const pref = usePreference();
  const system = useSyncExternalStore(subscribe, systemScheme, () => 'dark' as const);
  return pref === 'system' ? system : pref;
}

const LABEL = { dark: 'Dark', light: 'Light' } as const;

/** Two states only: the scheme in effect, and the other one. */
export function ThemeToggle() {
  const scheme = useSiteTheme();
  const next = scheme === 'dark' ? 'light' : 'dark';
  const onClick = useCallback(() => setPreference(next), [next]);
  return (
    <button
      type="button"
      className="chip"
      onClick={onClick}
      aria-label={`Theme: ${LABEL[scheme]}. Switch to ${LABEL[next]}.`}
    >
      <span aria-hidden className={`theme-glyph theme-${scheme}`} />
      {LABEL[scheme]}
    </button>
  );
}

/**
 * React 19 hydrates <html> as a singleton and drops attributes it did not
 * render, including the one the boot script set. Put it back before paint.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const pref = readPreference();
    if (pref !== 'system') document.documentElement.setAttribute('data-theme', pref);
  }, []);
  return null;
}

/** Applied before paint so a stored preference never flashes the wrong theme. */
export const themeBootScript = `try{var t=localStorage.getItem('${KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
