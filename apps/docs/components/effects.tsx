'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Page-wide effects, delegated so server-rendered markup only needs attributes:
 * - `data-reveal`: fades and lifts in the first time it scrolls into view.
 * - `.spot`: a soft light follows the pointer across the element.
 */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-shown])');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((el) => el.setAttribute('data-shown', ''));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-shown', '');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.spot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  return null;
}
