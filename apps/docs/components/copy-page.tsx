'use client';

import { useState } from 'react';

/** Copies the page's markdown twin, ready to paste into an AI chat or notes. */
export function CopyPage({ href }: { href: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      const res = await fetch(href);
      await navigator.clipboard.writeText(await res.text());
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 1600);
  }

  return (
    <div className="copy-page">
      <button type="button" className="chip" onClick={copy}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <rect
            x="5"
            y="5"
            width="8.5"
            height="8.5"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <span aria-live="polite">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy page'}
        </span>
      </button>
      <a className="chip" href={href} aria-label="View this page as Markdown">
        .md
      </a>
    </div>
  );
}
