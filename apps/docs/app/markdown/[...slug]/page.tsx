import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CopyPage } from '../../../components/copy-page';
import { DocsSidebar } from '../../../components/docs-sidebar';
import { TabsCard } from '../../../components/tabs';
import { getComponent, SITE } from '../../../lib/data';
import { markdownFor, markdownPaths } from '../../../lib/llm';
import { highlight, renderMarkdown } from '../../../lib/markdown';

type Params = { slug: string[] };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return markdownPaths().map((p) => ({ slug: p.split('/') }));
}

/** The page a markdown twin belongs to: its path, its title and where it sits. */
function pageFor(slug: string[]) {
  const key = slug.join('/');
  if (key === 'index') return { path: '/', title: SITE.name, section: null };
  if (key === 'docs/getting-started') {
    return { path: '/docs/getting-started', title: 'Getting started', section: 'Docs' };
  }
  const c = slug[0] === 'components' && slug[1] ? getComponent(slug[1]) : undefined;
  return c ? { path: `/components/${c.name}`, title: c.title, section: 'Components' } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = pageFor((await params).slug);
  if (!page) return {};
  return {
    title: `${page.title} as Markdown`,
    description: `${page.title}, as the plain Markdown that AI assistants and notes apps read.`,
    // The raw file is the canonical twin; this is a view of it.
    robots: { index: false },
  };
}

/**
 * A readable view of a page's markdown twin: rendered, or as source, with a
 * copy button and the raw file one click away. Agents still read `*.md`.
 */
export default async function MarkdownPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = pageFor(slug);
  const source = page ? markdownFor(page.path) : null;
  if (!page || !source) notFound();

  const [rendered, code] = await Promise.all([
    renderMarkdown(source),
    highlight(source, 'markdown'),
  ]);
  const raw = page.path === '/' ? '/index.md' : `${page.path}.md`;
  const lines = source.split('\n').length;
  const kb = (new TextEncoder().encode(source).length / 1024).toFixed(1);

  return (
    <div className="docs">
      <DocsSidebar current={page.path} />
      <article className="doc">
        <nav className="crumbs" aria-label="Breadcrumb">
          {page.section ? (
            <>
              <Link href={page.section === 'Docs' ? '/docs/getting-started' : '/components'}>
                {page.section}
              </Link>
              <span aria-hidden>/</span>
            </>
          ) : null}
          <Link href={page.path}>{page.title}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Markdown</span>
        </nav>

        <header className="doc-head">
          <div className="doc-title">
            <h1>{page.title}</h1>
            <CopyPage path={page.path} viewLink={false} />
          </div>
          <p>
            This page as plain Markdown, the format AI assistants read best. Copy it into a chat, or
            point an agent at the raw file.
          </p>
          <div className="md-actions">
            <Link className="chip" href={page.path}>
              ← Back to the page
            </Link>
            <a className="chip" href={raw}>
              Raw <span className="mono">{raw}</span>
            </a>
            <span className="tag">
              {lines} lines · {kb} KB
            </span>
          </div>
        </header>

        <TabsCard
          className="md-view"
          label={<span className="mono">{raw.split('/').pop()}</span>}
          tabs={[
            {
              id: 'rendered',
              title: 'Rendered',
              content: (
                <div className="prose md-rendered" dangerouslySetInnerHTML={{ __html: rendered }} />
              ),
            },
            {
              id: 'source',
              title: 'Source',
              content: (
                <div className="doc-code md-source" dangerouslySetInnerHTML={{ __html: code }} />
              ),
            },
          ]}
        />
      </article>
    </div>
  );
}
