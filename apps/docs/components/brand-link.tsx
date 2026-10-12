'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';

/**
 * The logo link. Elsewhere it goes home; on the home page itself it glides
 * back to the top (and drops any #section from the address).
 */
export function BrandLink({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname();

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Let new-tab and modified clicks behave as links.
    if (pathname !== '/' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    if (window.location.hash) history.replaceState(null, '', '/');
  }

  return (
    <Link href="/" className="brand" aria-label={label} onClick={onClick}>
      {children}
    </Link>
  );
}
