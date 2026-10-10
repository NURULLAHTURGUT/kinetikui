import fs from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';

import { renderMarkdown } from '../../../lib/markdown';

export const metadata: Metadata = {
  title: 'Getting started',
  description: 'Set up Kinetik UI in an Expo app and add your first component.',
  alternates: { types: { 'text/markdown': '/docs/getting-started.md' } },
};

export default async function GettingStarted() {
  const source = fs.readFileSync(path.join(process.cwd(), 'content', 'getting-started.md'), 'utf8');
  const html = await renderMarkdown(source);
  return (
    <main className="page" style={{ gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: 820 }}>
      <article className="article">
        <header className="article-head">
          <span className="overline">Docs</span>
          <h1>Getting started</h1>
          <p>Add motion components to an Expo app in two commands.</p>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
