'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CheckIcon, CopyIcon } from './icons';

/**
 * Copies the page's markdown twin, ready to paste into an AI chat or notes,
 * and links to a readable view of it. `path` is the page (`/components/x`).
 */
export function CopyPage({ path, viewLink = true }: { path: string; viewLink?: boolean }) {
  const href = path === '/' ? '/index.md' : `${path}.md`;
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
      {viewLink ? (
        <Link
          className="chip"
          href={`/markdown${path === '/' ? '/index' : path}`}
          aria-label="View this page as Markdown"
        >
          .md
        </Link>
      ) : null}
    </div>
  );
}
