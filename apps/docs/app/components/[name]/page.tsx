import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import type { Controls } from '@kinetik/registry/demo-kit/types';

import { CopyButton } from '../../../components/copy-button';
import { CopyPage } from '../../../components/copy-page';
import { DocsSidebar } from '../../../components/docs-sidebar';
import { PreviewSlot } from '../../../components/preview-slot';
import { TabsCard } from '../../../components/tabs';
import { Toc } from '../../../components/toc';
import {
  allComponents,
  getComponent,
  navOrder,
  describeMeasurement,
  SITE,
  type PropsTable,
} from '../../../lib/data';
import { highlight, renderMarkdown } from '../../../lib/markdown';

type Params = { name: string };

export function generateStaticParams(): Params[] {
  return allComponents.map((c) => ({ name: c.name }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const c = getComponent((await params).name);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    alternates: { types: { 'text/markdown': `/components/${c.name}.md` } },
  };
}

export default async function ComponentPage({ params }: { params: Promise<Params> }) {
  const { name } = await params;
  const c = getComponent(name);
  if (!c) notFound();

  const [docsHtml, sources, qr] = await Promise.all([
    renderMarkdown(c.docs),
    Promise.all(c.source.map(async (f) => ({ ...f, html: await highlight(f.content, 'tsx') }))),
    QRCode.toString(`${SITE.playgroundScheme}://${c.category === 'screen' ? 's' : 'c'}/${c.name}`, {
      type: 'svg',
      margin: 0,
      color: { dark: '#0B0D12', light: '#FFFFFF' },
    }),
  ]);
  const main = sources.find((s) => s.path.endsWith(`/${c.name}.tsx`));
  const shared = sources.filter((s) => s !== main);

  const order = navOrder();
  const index = order.findIndex((x) => x.name === c.name);
  const prev = index > 0 ? order[index - 1] : undefined;
  const next = index < order.length - 1 ? order[index + 1] : undefined;
  const deps = c.dependencies;
  const install = c.install.cli.replace(/^npx /, '');
  const managers = [
    { id: 'npm', title: 'npm', command: `npx ${install}` },
    { id: 'pnpm', title: 'pnpm', command: `pnpm dlx ${install}` },
    { id: 'bun', title: 'bun', command: `bunx ${install}` },
    { id: 'yarn', title: 'yarn', command: `yarn dlx ${install}` },
  ];
  const toc = [
    { id: 'installation', label: 'Installation' },
    { id: 'manual', label: 'Install manually' },
    { id: 'usage', label: 'Usage' },
    { id: 'props', label: 'Props' },
    { id: 'quality', label: 'Performance and accessibility' },
    { id: 'device', label: 'Try it on a device' },
    { id: 'source', label: 'Source files' },
  ];

  return (
    <div className="docs">
      <DocsSidebar current={`/components/${c.name}`} />

      <article className="doc">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/docs/getting-started">Docs</Link>
          <span aria-hidden>/</span>
          <span>{c.categoryTitle}</span>
          <span aria-hidden>/</span>
          <span aria-current="page">{c.title}</span>
        </nav>

        <header className="doc-head">
          <div className="doc-title">
            <h1>{c.title}</h1>
            <CopyPage href={`/components/${c.name}.md`} />
          </div>
          <p>{c.description}</p>
          <div className="doc-meta">
            <span className="tag">v{c.version}</span>
            <span className="tag">{c.web === 'live' ? 'Live on web' : 'Device only'}</span>
            {deps.map((d) => (
              <span key={d} className="tag mono">
                {d}
              </span>
            ))}
          </div>
        </header>

        <TabsCard
          className="doc-preview"
          label={
            <>
              <CodeGlyph /> Component preview
            </>
          }
          tabs={[
            {
              id: 'preview',
              title: 'Preview',
              content:
                c.web === 'live' ? (
                  <PreviewSlot
                    name={c.name}
                    controls={c.controls as Controls}
                    screen={c.category === 'screen'}
                  />
                ) : (
                  <p className="preview-note">
                    {c.webNote ??
                      'This effect needs native APIs the browser preview cannot emulate.'}
                  </p>
                ),
            },
            {
              id: 'code',
              title: 'Code',
              content: main ? (
                <div className="doc-code" dangerouslySetInnerHTML={{ __html: main.html }} />
              ) : null,
            },
          ]}
        />

        <section className="doc-section" id="installation">
          <h2>Installation</h2>
          <TabsCard
            className="doc-install"
            label={<span className="mono">Kinetik CLI</span>}
            tabs={managers.map((m) => ({
              id: m.id,
              title: m.title,
              content: (
                <div className="command command-flat">
                  <code>{m.command}</code>
                  <CopyButton text={m.command} />
                </div>
              ),
            }))}
          />
          <p className="doc-hint">
            The CLI copies the source and installs native dependencies with{' '}
            <code>npx expo install</code>, so versions match your Expo SDK. With shadcn:{' '}
            <code>{c.install.shadcn}</code>
          </p>
        </section>

        <section className="doc-section" id="manual">
          <h2>Install manually</h2>
          <ol className="steps-list">
            {deps.length > 0 && (
              <li>
                <span className="steps-title">Install dependencies</span>
                <div className="command command-flat">
                  <code>npx expo install {deps.join(' ')}</code>
                  <CopyButton text={`npx expo install ${deps.join(' ')}`} />
                </div>
              </li>
            )}
            <li>
              <span className="steps-title">Copy the source files</span>
              <ul className="file-list">
                {sources.map((f) => (
                  <li key={f.path}>
                    <code>{f.path}</code>
                  </li>
                ))}
              </ul>
              <a className="button button-secondary button-compact" href="#source">
                View source files
              </a>
            </li>
          </ol>
        </section>

        <section
          className="doc-section prose"
          id="usage"
          dangerouslySetInnerHTML={{ __html: docsHtml }}
        />

        <section className="doc-section" id="props">
          <h2>Props</h2>
          {c.propsTables.map((t) => (
            <PropsTableView key={t.name} table={t} />
          ))}
        </section>

        <section className="doc-section" id="quality">
          <h2>Performance and accessibility</h2>
          <div className="notes">
            <div className="note">
              <h3>Performance</h3>
              <dl>
                <div>
                  <dt>Budget</dt>
                  <dd>{c.perf.budget}</dd>
                </div>
                <div>
                  <dt>Measured</dt>
                  <dd>
                    {c.perf.measurements.map((m) => (
                      <p key={`${m.device}-${m.kind}`}>{describeMeasurement(m)}</p>
                    ))}
                    {!c.perf.measurements.some((m) => m.kind === 'device') && (
                      <p>Real-device measurement pending.</p>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="note">
              <h3>Accessibility</h3>
              <dl>
                <div>
                  <dt>Reduced motion</dt>
                  <dd>{c.a11y.reducedMotion}</dd>
                </div>
                <div>
                  <dt>Screen readers</dt>
                  <dd>{c.a11y.screenReader}</dd>
                </div>
                <div>
                  <dt>Touch target</dt>
                  <dd>{c.a11y.touchTarget}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="doc-section" id="device">
          <h2>Try it on a device</h2>
          <div className="note device">
            <div
              className="qr"
              role="img"
              aria-label={`QR code that opens ${c.title} in the Kinetik playground`}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="muted">
              Scan with a phone that has the Kinetik playground installed to open this demo with
              real haptics and sensors.
            </p>
          </div>
        </section>

        <section className="doc-section" id="source">
          <h2>Source files</h2>
          <div className="source-list">
            {main && (
              <details className="source" open>
                <summary>{main.path}</summary>
                <div dangerouslySetInnerHTML={{ __html: main.html }} />
              </details>
            )}
            {shared.map((f) => (
              <details className="source" key={f.path}>
                <summary>{f.path}</summary>
                <div dangerouslySetInnerHTML={{ __html: f.html }} />
              </details>
            ))}
          </div>
        </section>

        <nav className="pager" aria-label="More components">
          {prev ? (
            <Link href={`/components/${prev.name}`} className="pager-link">
              <span>Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/components/${next.name}`} className="pager-link pager-next">
              <span>Next</span>
              {next.title}
            </Link>
          )}
        </nav>
      </article>

      <Toc items={toc} />
    </div>
  );
}

function CodeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PropsTableView({ table }: { table: PropsTable }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 className="mono" style={{ fontSize: 14, margin: '0 0 8px' }}>
        {table.name}
      </h3>
      <div className="props-wrap">
        <table className="props">
          <thead>
            <tr>
              <th scope="col">Prop</th>
              <th scope="col">Type</th>
              <th scope="col">Default</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {table.props.map((p) => (
              <tr key={p.name}>
                <td className="prop-name">
                  <code>{p.name}</code>
                  {p.required && <span className="required">required</span>}
                </td>
                <td className="prop-type">
                  <code>{p.type}</code>
                </td>
                <td>{p.default ? <code>{p.default}</code> : <span className="muted">—</span>}</td>
                <td className="muted">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
