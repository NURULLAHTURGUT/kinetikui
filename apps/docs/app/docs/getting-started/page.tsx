import fs from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import Link from 'next/link';

import { CopyPage } from '../../../components/copy-page';
import { DocsSidebar } from '../../../components/docs-sidebar';
import { Toc } from '../../../components/toc';
import { navOrder } from '../../../lib/data';
import { renderMarkdown } from '../../../lib/markdown';

export const metadata: Metadata = {
  title: 'Getting started',
  description: 'Set up Kinetik UI in an Expo app and add your first component.',
  alternates: { types: { 'text/markdown': '/docs/getting-started.md' } },
};

/** Same slugs as the heading renderer in lib/markdown.ts. */
function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default async function GettingStarted() {
  const source = fs.readFileSync(path.join(process.cwd(), 'content', 'getting-started.md'), 'utf8');
  const html = await renderMarkdown(source);
  const toc = [...source.matchAll(/^## (.+)$/gm)].map((m) => {
    const label = (m[1] ?? '').replace(/`/g, '');
    return { id: slug(label), label };
  });
  const first = navOrder()[0];

  return (
    <div className="docs">
      <DocsSidebar current="/docs/getting-started" />
      <article className="doc">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/docs/getting-started">Docs</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Getting started</span>
        </nav>
        <header className="doc-head">
          <div className="doc-title">
            <h1>Getting started</h1>
            <CopyPage path="/docs/getting-started" />
          </div>
          <p>Add motion components to an Expo app in two commands.</p>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        {first && (
          <nav className="pager" aria-label="Next">
            <span />
            <Link href={`/components/${first.name}`} className="pager-link pager-next">
              <span>Next</span>
              {first.title}
            </Link>
          </nav>
        )}
      </article>
      <Toc items={toc} />
    </div>
  );
}
