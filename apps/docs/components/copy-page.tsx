'use client';

import { useState } from 'react';

import { CheckIcon, CopyIcon } from './icons';

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
        {state === 'copied' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
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
