'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

const KEY = 'kinetik-docs-nav-scroll';

/**
 * The scrolling sidebar. Each page renders its own copy, so it remembers where
 * it was scrolled to and picks up there on the next page, keeping the current
 * link in view.
 */
export function DocsNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    try {
      const saved = Number(sessionStorage.getItem(KEY));
      if (saved > 0) nav.scrollTop = saved;
    } catch {
      // Storage blocked: start at the top.
    }
    const active = nav.querySelector('[aria-current="page"]');
    if (active) {
      const a = active.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      if (a.top < n.top + 24 || a.bottom > n.bottom - 48) {
        nav.scrollTop += a.top - n.top - n.height / 2 + a.height / 2;
      }
    }
    const save = () => {
      try {
        sessionStorage.setItem(KEY, String(nav.scrollTop));
      } catch {
        // Storage blocked: nothing to remember.
      }
    };
    save();
    nav.addEventListener('scroll', save, { passive: true });
    return () => nav.removeEventListener('scroll', save);
  }, []);

  return (
    <nav ref={ref} className="docs-nav" aria-label="Documentation">
      {children}
    </nav>
  );
}
