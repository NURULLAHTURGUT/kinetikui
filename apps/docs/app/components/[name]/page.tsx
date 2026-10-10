import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import type { Controls } from '@kinetik/registry/demo-kit/types';

import { CopyButton } from '../../../components/copy-button';
import { PreviewSlot } from '../../../components/preview-slot';
import {
  allComponents,
  byCategory,
  getComponent,
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

  return (
    <div className="page">
      <nav className="sidebar" aria-label="Components">
        {byCategory().map((g) => (
          <div key={g.key}>
            <span className="overline">{g.items[0]?.categoryTitle}</span>
            <ul>
              {g.items.map((item) => (
                <li key={item.name}>
                  <Link
                    href={`/components/${item.name}`}
                    aria-current={item.name === c.name ? 'page' : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <article className="article">
        <header className="article-head">
          <span className="overline">{c.categoryTitle}</span>
          <h1>{c.title}</h1>
          <p>{c.description}</p>
          <div className="tags">
            <span className="tag">v{c.version}</span>
            {c.web === 'live' ? (
              <span className="tag tag-ice">Live on web</span>
            ) : (
              <span className="tag tag-ember">Device only</span>
            )}
            {c.dependencies.map((d) => (
              <span key={d} className="tag mono">
                {d}
              </span>
            ))}
          </div>
        </header>

        {c.web === 'live' ? (
          <PreviewSlot
            name={c.name}
            controls={c.controls as Controls}
            screen={c.category === 'screen'}
          />
        ) : (
          <div className="note">
            <h3>Preview on a device</h3>
            <p className="muted">
              {c.webNote ?? 'This effect needs native APIs the browser preview cannot emulate.'}
            </p>
          </div>
        )}

        <section className="section" aria-labelledby="install">
          <h2 id="install">Install</h2>
          <div className="install">
            <span className="install-label">
              Kinetik CLI (recommended: installs SDK-matched versions with expo install)
            </span>
            <div className="command">
              <code>
                <span className="prompt">$ </span>
                {c.install.cli}
              </code>
              <CopyButton text={c.install.cli} />
            </div>
            <span className="install-label">
              shadcn CLI (copies the same files; check versions with npx expo install --check)
            </span>
            <div className="command">
              <code>
                <span className="prompt">$ </span>
                {c.install.shadcn}
              </code>
              <CopyButton text={c.install.shadcn} />
            </div>
          </div>
        </section>

        <section
          className="section prose"
          aria-label="Documentation"
          dangerouslySetInnerHTML={{ __html: docsHtml }}
        />

        <section className="section" aria-labelledby="props">
          <h2 id="props">Props</h2>
          {c.propsTables.map((t) => (
            <PropsTableView key={t.name} table={t} />
          ))}
        </section>

        <section className="section" aria-labelledby="quality">
          <h2 id="quality">Performance and accessibility</h2>
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

        <section className="section" aria-labelledby="device">
          <h2 id="device">Try it on a device</h2>
          <div className="note device">
            <div
              className="qr"
              role="img"
              aria-label={`QR code that opens ${c.title} in the Kinetik playground`}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <div>
              <p style={{ margin: '0 0 8px' }}>
                Scan with a phone that has the Kinetik playground installed to open this demo with
                real haptics and sensors.
              </p>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Demo video: pending real-device recording.
              </p>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="source">
          <h2 id="source">Source</h2>
          <div style={{ display: 'grid', gap: 10 }}>
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
      </article>
    </div>
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
