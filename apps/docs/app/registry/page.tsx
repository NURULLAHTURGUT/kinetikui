import fs from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import Link from 'next/link';

import { CopyButton } from '../../components/copy-button';
import { DocsSidebar } from '../../components/docs-sidebar';
import { CATEGORY_ORDER, getComponent } from '../../lib/data';
import { SITE_URL } from '../../lib/llm';

export const metadata: Metadata = {
  title: 'Registry',
  description:
    'Every Kinetik UI item as a shadcn-compatible JSON file, read by the CLI, the MCP server and shadcn.',
};

type Item = {
  name: string;
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: unknown[];
  meta: { kind: 'component' | 'template' | 'shared'; category?: string; version: string };
};

/** The built registry index (scripts/build-docs.ts copies it into public/r before every build). */
function loadRegistry(): Item[] {
  const file = path.join(process.cwd(), 'public', 'r', 'registry.json');
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { items: Item[] }).items;
}

const GROUPS = [
  { kind: 'component', title: 'Components', hint: 'Install into components/kinetik/.' },
  {
    kind: 'template',
    title: 'Screen templates',
    hint: 'Install into components/kinetik/screens/.',
  },
  { kind: 'shared', title: 'Shared', hint: 'Tokens, motion and hooks; pulled in automatically.' },
] as const;

/** `https://kinetik-ui.dev/r/kinetik-tokens.json` → `kinetik-tokens`. */
const shortName = (dep: string) => dep.replace(/^.*\//, '').replace(/\.json$/, '');

export default function RegistryPage() {
  const items = loadRegistry();
  const rank = (i: Item) => {
    const at = CATEGORY_ORDER.indexOf(i.meta.category as (typeof CATEGORY_ORDER)[number]);
    return at < 0 ? CATEGORY_ORDER.length : at;
  };
  const cli = 'npx kinetik-ui add glint-card';
  const shadcn = `npx shadcn@latest add ${SITE_URL}/r/glint-card.json`;

  return (
    <div className="docs">
      <DocsSidebar current="/registry" />
      <article className="doc">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/docs/getting-started">Docs</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Registry</span>
        </nav>

        <header className="doc-head">
          <div className="doc-title">
            <h1>Registry</h1>
            <a className="chip" href="/r/registry.json">
              Raw <span className="mono">registry.json</span>
            </a>
          </div>
          <p>
            Every item as a shadcn-compatible JSON file with its full source. The Kinetik CLI and
            the MCP server read these files, and shadcn can install any of them directly.
          </p>
          <div className="md-actions">
            {GROUPS.map((g) => (
              <span key={g.kind} className="tag">
                {items.filter((i) => i.meta.kind === g.kind).length} {g.title.toLowerCase()}
              </span>
            ))}
          </div>
        </header>

        <div className="registry-install">
          <div className="command">
            <code>{cli}</code>
            <CopyButton text={cli} />
          </div>
          <div className="command">
            <code>{shadcn}</code>
            <CopyButton text={shadcn} />
          </div>
        </div>

        {GROUPS.map((g) => {
          const group = items
            .filter((i) => i.meta.kind === g.kind)
            .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
          return (
            <section className="doc-section" key={g.kind} id={g.kind}>
              <h2>
                {g.title} <span className="registry-count">{group.length}</span>
              </h2>
              <p className="doc-hint registry-hint">{g.hint}</p>
              <ul className="registry-list">
                {group.map((i) => {
                  const page = getComponent(i.name);
                  return (
                    <li key={i.name} className="registry-row">
                      <div className="registry-main">
                        <div className="registry-name">
                          {page ? (
                            <Link href={`/components/${i.name}`}>{i.title}</Link>
                          ) : (
                            <span>{i.title}</span>
                          )}
                          <code>{i.name}</code>
                          {page ? <span className="registry-cat">{page.categoryTitle}</span> : null}
                        </div>
                        <p>{i.description}</p>
                        {i.registryDependencies.length > 0 ? (
                          <div className="registry-deps">
                            <span>Uses</span>
                            {i.registryDependencies.map((d) => (
                              <code key={d}>{shortName(d)}</code>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="registry-side">
                        <span className="registry-files">
                          {i.files.length} file{i.files.length === 1 ? '' : 's'} · v{i.meta.version}
                        </span>
                        <a
                          className="chip"
                          href={`/r/${i.name}.json`}
                          aria-label={`${i.title} JSON`}
                        >
                          JSON
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </article>
    </div>
  );
}
