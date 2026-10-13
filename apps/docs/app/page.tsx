import type { Controls } from '@kinetik/registry/demo-kit/types';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { BrandIcon, type BrandName } from '../components/brand-icons';
import { CopyButton } from '../components/copy-button';
import { ArrowDownIcon, ArrowRightIcon } from '../components/icons';
import { KineticField } from '../components/kinetic-field';
import { LogoMark } from '../components/logo';
import { ShowcasePreview } from '../components/showcase';
import { TabsCard } from '../components/tabs';
import { Terminal, type TerminalLine } from '../components/terminal';
import './home.css';
import { allComponents, componentCount, byCategory, getComponent, screenCount } from '../lib/data';

const CATEGORY_TITLE: Record<string, string> = {
  background: 'Backgrounds',
  card: 'Cards',
  interaction: 'Interaction',
  input: 'Inputs',
  disclosure: 'Disclosure',
  overlay: 'Overlays',
  text: 'Text',
  navigation: 'Navigation',
  feedback: 'Feedback',
  data: 'Data',
  screen: 'Screen templates',
};

/** Landing showcase: a large tile, two beside it, then a small and a wide one. */
const FEATURED = [
  'glint-card',
  'beam-button',
  'slide-confirm',
  'expand-card',
  'drift-marquee',
] as const;

const INSTALL = 'npx kinetik-ui add glint-card';

/** What an agent session with the MCP server looks like (landing demo). */
const AGENT_SCRIPT: TerminalLine[] = [
  { kind: 'ask', text: 'Add a liquid tab bar to my home screen' },
  { kind: 'tool', text: 'kinetik-ui · search_components("tab bar")' },
  { kind: 'out', text: 'liquid-tabs, dock-bar' },
  { kind: 'tool', text: 'kinetik-ui · get_install_plan(["liquid-tabs"])' },
  { kind: 'cmd', text: 'npx kinetik-ui add liquid-tabs' },
  { kind: 'ok', text: 'components/kinetik/liquid-tabs.tsx' },
  {
    kind: 'say',
    text: 'Added <LiquidTabs> to your home screen. It reads your theme and respects reduced motion.',
  },
];

const MCP_SERVER = '{ "command": "npx", "args": ["-y", "kinetik-ui", "mcp"] }';
const MCP_JSON = `{\n  "mcpServers": {\n    "kinetik-ui": ${MCP_SERVER}\n  }\n}`;

const MCP_CLIENTS: {
  id: string;
  title: string;
  icon?: BrandName;
  where: string;
  config: string;
}[] = [
  {
    id: 'claude-code',
    title: 'Claude Code',
    icon: 'claude',
    where: 'Terminal',
    config: 'claude mcp add kinetik-ui -- npx -y kinetik-ui mcp',
  },
  { id: 'cursor', title: 'Cursor', icon: 'cursor', where: '.cursor/mcp.json', config: MCP_JSON },
  {
    id: 'codex',
    title: 'Codex',
    icon: 'codex',
    where: 'Terminal (writes ~/.codex/config.toml)',
    config: 'codex mcp add kinetik-ui -- npx -y kinetik-ui mcp',
  },
  {
    id: 'opencode',
    title: 'OpenCode',
    icon: 'opencode',
    where: 'opencode.json in your project root',
    config: `{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "kinetik-ui": {\n      "type": "local",\n      "command": ["npx", "-y", "kinetik-ui", "mcp"],\n      "enabled": true\n    }\n  }\n}`,
  },
  {
    id: 'windsurf',
    title: 'Windsurf',
    icon: 'windsurf',
    where: '~/.codeium/windsurf/mcp_config.json',
    config: MCP_JSON,
  },
  {
    id: 'other',
    title: 'Other',
    where: 'Claude Desktop, Gemini CLI, Cline and any MCP client',
    config: MCP_JSON,
  },
];

/** Clients drawn on the left of the MCP diagram, top to bottom. */
const HUB_CLIENTS: { name: BrandName; title: string }[] = [
  { name: 'claude', title: 'Claude' },
  { name: 'codex', title: 'Codex' },
  { name: 'cursor', title: 'Cursor' },
  { name: 'gemini', title: 'Gemini' },
  { name: 'opencode', title: 'OpenCode' },
  { name: 'windsurf', title: 'Windsurf' },
  { name: 'cline', title: 'Cline' },
];

const MCP_TOOLS = [
  { name: 'list_components', does: 'Browse' },
  { name: 'search_components', does: 'Find' },
  { name: 'get_component', does: 'Read source' },
  { name: 'get_install_plan', does: 'Plan install' },
  { name: 'get_tokens', does: 'Theme' },
];

const STEPS = [
  { id: 'init', title: 'Init', note: 'Tokens and motion presets', command: 'npx kinetik-ui init' },
  {
    id: 'add',
    title: 'Add',
    note: 'Source and SDK-matched deps',
    command: 'npx kinetik-ui add glint-card',
  },
  { id: 'ship', title: 'Ship', note: 'Your code. Change anything.' },
] as const;

/** Frame times for the UI-thread tile: the JS lane spikes, the UI lane stays flat. */
const JS_FRAMES = [
  30, 34, 28, 80, 36, 30, 95, 40, 32, 30, 70, 34, 28, 30, 100, 44, 30, 34, 62, 30, 28, 36, 86, 32,
];
const UI_FRAMES = JS_FRAMES.map((_, i) => 26 + ((i * 7) % 5));

const HUB_HEIGHT = 384;

/** Stagger index for entrance animations (read by CSS as --d). */
const delay = (d: number) => ({ '--d': d }) as CSSProperties;

/**
 * Curves from each row on one side of the MCP diagram to its centre. The
 * diagram is a fixed 384 px tall, so only the width stretches.
 */
function Beams({ count, out = false }: { count: number; out?: boolean }) {
  const mid = HUB_HEIGHT / 2;
  return (
    <svg
      className={`beams ${out ? 'beams-out' : ''}`}
      viewBox={`0 0 200 ${HUB_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      {Array.from({ length: count }, (_, i) => {
        const y = ((i + 0.5) / count) * HUB_HEIGHT;
        const d = out
          ? `M0 ${mid} C100 ${mid} 100 ${y} 200 ${y}`
          : `M0 ${y} C100 ${y} 100 ${mid} 200 ${mid}`;
        return (
          <g key={i} style={delay(i)}>
            <path className="beam" d={d} pathLength={1} />
            <path className="beam-pulse" d={d} pathLength={1} />
          </g>
        );
      })}
    </svg>
  );
}

/** Splits a heading into words that blur and rise in one after another. */
function Words({ text, start = 0 }: { text: string; start?: number }) {
  return text.split(' ').map((word, i) => (
    <span key={i} className="word" style={{ '--w': start + i } as CSSProperties}>
      {word}
      {i < text.split(' ').length - 1 ? ' ' : ''}
    </span>
  ));
}

export default function Home() {
  const featured = FEATURED.map((name) => getComponent(name)).filter((c) => c !== undefined);

  return (
    <main className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-backdrop" aria-hidden>
          <KineticField />
        </div>
        <div className="hero-mark" aria-hidden>
          <LogoMark width={1200} className="hero-mark-fallback" />
        </div>
        <div className="hero-content">
          <h1 id="hero-title" className="words-in">
            <Words text="Motion parts" />
            <br />
            <span className="hero-second">
              <Words text="for Expo." start={2} />
            </span>
          </h1>
          <p className="hero-lede rise" style={delay(3)}>
            Animated components you copy into your app with one command.
          </p>
          <div className="hero-actions rise" style={delay(4)}>
            <Link className="button button-primary" href="#components">
              Browse components
              <ArrowDownIcon className="button-icon" />
            </Link>
            <Link className="button button-secondary" href="/docs/getting-started">
              Docs
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="Components">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1}>
              {allComponents.map((c) => (
                <li key={c.name}>
                  <Link href={`/components/${c.name}`} tabIndex={copy === 1 ? -1 : undefined}>
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <section className="block" aria-labelledby="showcase-title">
        <header className="block-head" data-reveal>
          <span className="overline">Live</span>
          <h2 id="showcase-title">
            <Words text="See it move." />
          </h2>
          <p>
            Every tile below is the real component running in your browser. Touch it, drag it, tap
            it.
          </p>
        </header>
        <div className="bento">
          {featured.map((c, i) => (
            <article
              key={c.name}
              className={`bento-tile spot ${i === 0 ? 'bento-hero' : i === 4 ? 'bento-wide' : ''}`}
              data-reveal
              style={delay(i)}
            >
              <ShowcasePreview name={c.name} controls={c.controls as Controls} />
              <footer className="bento-foot">
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                </div>
                <Link
                  href={`/components/${c.name}`}
                  className="bento-link"
                  aria-label={`${c.title} docs`}
                >
                  <ArrowRightIcon size={18} />
                </Link>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="block" aria-labelledby="principles-title">
        <header className="block-head" data-reveal>
          <span className="overline">Principles</span>
          <h2 id="principles-title">
            <Words text="Built like the rest of your app." />
          </h2>
        </header>
        <div className="pillars">
          <article className="pillar pillar-wide spot" data-reveal style={delay(0)}>
            <div className="pillar-art art-frames" aria-hidden>
              {[
                { lane: 'JS thread', state: 'busy', frames: JS_FRAMES, kind: 'js' },
                { lane: 'UI thread', state: '60 fps', frames: UI_FRAMES, kind: 'ui' },
              ].map((row) => (
                <div key={row.kind} className={`frames frames-${row.kind}`}>
                  <span className="frames-lane">{row.lane}</span>
                  <span className="frames-bars">
                    <span className="frames-track">
                      {[...row.frames, ...row.frames].map((h, i) => (
                        <i key={i} style={{ '--h': h } as CSSProperties} />
                      ))}
                    </span>
                  </span>
                  <span className="frames-state">{row.state}</span>
                </div>
              ))}
            </div>
            <h3>On the UI thread</h3>
            <p>Gestures, springs and shaders stay smooth when JavaScript is busy.</p>
          </article>

          <article className="pillar spot" data-reveal style={delay(1)}>
            <div className="pillar-art art-editor" aria-hidden>
              <span className="editor-tab">glint-card.tsx</span>
              <span className="editor-lines">
                {[62, 44, 78, 30, 56, 70, 38].map((w, i) => (
                  <i key={i} className={i === 3 ? 'edit' : undefined} style={{ width: `${w}%` }} />
                ))}
              </span>
            </div>
            <h3>Your source</h3>
            <p>Copied into your project. Change anything.</p>
          </article>

          <article className="pillar spot" data-reveal style={delay(2)}>
            <div className="pillar-art art-a11y" aria-hidden>
              <span className="a11y-bubble">Glint card, button</span>
              <span className="a11y-target">
                <span />
              </span>
              <span className="a11y-toggle">
                Reduce motion <b />
              </span>
            </div>
            <h3>Accessible by default</h3>
            <p>Reduced motion, screen-reader labels, 44 pt targets.</p>
          </article>

          <article className="pillar pillar-wide spot" data-reveal style={delay(3)}>
            <div className="pillar-art art-brand" aria-hidden>
              <span className="brand-code mono">
                {'<KinetikProvider colors={{ ember: '}
                <b />
                {' }}>'}
              </span>
              <span className="brand-kit">
                <span className="kit-button">Continue</span>
                <span className="kit-switch" />
                <span className="kit-bar">
                  <span />
                </span>
                <span className="kit-chip">New</span>
                <span className="kit-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </div>
            <h3>One design language</h3>
            <p>Shared tokens and three springs. Rebrand everything in one place.</p>
          </article>
        </div>
      </section>

      <section className="block" aria-labelledby="how-title">
        <header className="block-head block-head-row" data-reveal>
          <div>
            <span className="overline">How it works</span>
            <h2 id="how-title">
              <Words text="Two commands to motion." />
            </h2>
          </div>
          <Link className="button button-secondary" href="/docs/getting-started">
            Read the guide
            <ArrowRightIcon className="button-icon" />
          </Link>
        </header>
        <ol className="flow">
          {STEPS.map((step, i) => (
            <li key={step.id} className="flow-step spot" data-reveal style={delay(i)}>
              {i < STEPS.length - 1 ? <span className="flow-link" aria-hidden /> : null}
              <div className={`flow-art flow-${step.id}`} aria-hidden>
                {step.id === 'init' && (
                  <span className="tokens">
                    <i className="tok-swatch" />
                    <i className="tok-swatch tok-azure" />
                    <i className="tok-swatch tok-muted" />
                    <i>spring</i>
                    <i>16</i>
                    <i>Aa</i>
                  </span>
                )}
                {step.id === 'add' && (
                  <span className="tree mono">
                    <span>components/kinetik/</span>
                    <span className="tree-file">└ glint-card.tsx</span>
                    <span className="tree-deps">✓ expo install</span>
                  </span>
                )}
                {step.id === 'ship' && (
                  <span className="phone">
                    <span className="phone-card" />
                    <span className="phone-row" />
                    <span className="phone-row short" />
                    <span className="phone-tabs">
                      <i />
                    </span>
                  </span>
                )}
              </div>
              <div className="flow-head">
                <span className="flow-index">{String(i + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <span className="flow-note">{step.note}</span>
              </div>
              {'command' in step ? (
                <div className="command flow-command">
                  <code>
                    <span className="prompt">$ </span>
                    {step.command}
                  </code>
                  <CopyButton text={step.command} />
                </div>
              ) : (
                <div className="command flow-command flow-done">
                  <code>components/kinetik/*.tsx</code>
                  <span className="flow-check">✓</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="block agents" id="mcp" aria-labelledby="agents-title">
        <header className="block-head" data-reveal>
          <span className="overline">MCP server</span>
          <h2 id="agents-title">
            <Words text="Built for AI agents." />
          </h2>
          <p>Your agent finds, reads and installs components the right way.</p>
        </header>

        <div className="hub" data-reveal>
          <ul className="hub-clients" aria-label="Works with">
            {HUB_CLIENTS.map((client, i) => (
              <li key={client.name} className={`hub-client hub-${client.name}`} style={delay(i)}>
                <BrandIcon name={client.name} size={18} />
                <span>{client.title}</span>
              </li>
            ))}
          </ul>
          <Beams count={HUB_CLIENTS.length} />
          <div className="hub-core">
            <span className="hub-node">
              <span className="hub-ring" aria-hidden />
              <LogoMark width={64} />
            </span>
            <code className="hub-label">kinetik-ui mcp</code>
          </div>
          <Beams count={MCP_TOOLS.length} out />
          <ul className="hub-tools" aria-label="MCP tools">
            {MCP_TOOLS.map((tool, i) => (
              <li key={tool.name} className="hub-tool" style={delay(i)}>
                <code>{tool.name}</code>
                <span>{tool.does}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="agents-grid">
          <div className="agents-copy" data-reveal>
            <TabsCard
              className="agents-config"
              label={<span className="mono">Add the server</span>}
              tabs={MCP_CLIENTS.map((client) => ({
                id: client.id,
                title: (
                  <span className="client-tab">
                    {client.icon ? <BrandIcon name={client.icon} size={14} /> : null}
                    {client.title}
                  </span>
                ),
                content: (
                  <div className="snippet">
                    <span className="snippet-where">{client.where}</span>
                    <pre>
                      <code>{client.config}</code>
                    </pre>
                    <CopyButton text={client.config} />
                  </div>
                ),
              }))}
            />
            <ul className="agents-extras">
              <li>
                <a href="/llms.txt">
                  <code>/llms.txt</code>
                </a>
              </li>
              <li>
                <code>.md</code> on every page
              </li>
              <li>
                <code>npx kinetik-ui agents</code>
              </li>
            </ul>
          </div>
          <div data-reveal style={delay(1)}>
            <Terminal
              script={AGENT_SCRIPT}
              title="agent · my-expo-app"
              label="An AI agent using the Kinetik MCP server to add a tab bar"
            />
          </div>
        </div>
      </section>

      <section className="block" id="components" aria-labelledby="components-title">
        <header className="block-head" data-reveal>
          <span className="overline">Catalogue</span>
          <h2 id="components-title">
            <Words text="Eleven kinds of motion." />
          </h2>
          <p>
            {componentCount} components and {screenCount} screen templates, each with a live demo, a
            props table and notes on when not to use it.
          </p>
        </header>
        <div className="categories">
          {byCategory().map((group, i) => (
            <Link
              key={group.key}
              href={`/components#${group.key}`}
              className="category spot"
              data-reveal
              style={delay(i)}
            >
              <span className="category-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="category-title">{CATEGORY_TITLE[group.key]}</span>
              <span className="category-names">
                {group.items
                  .slice(0, 3)
                  .map((c) => c.title)
                  .join(' · ')}
                {group.items.length > 3 ? ' …' : ''}
              </span>
              <span className="category-foot">
                <span>{group.items.length}</span>
                <span className="category-arrow" aria-hidden>
                  <ArrowRightIcon size={16} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cta" aria-labelledby="cta-title" data-reveal>
        <div className="cta-glow" aria-hidden />
        <div className="cta-mark" aria-hidden>
          <LogoMark width={1200} />
        </div>
        <h2 id="cta-title">
          <Words text="Make your app" />{' '}
          <span className="hero-second">
            <Words text="move." start={3} />
          </span>
        </h2>
        <p>Copy the first component in under a minute.</p>
        <div className="command cta-command">
          <code>
            <span className="prompt">$ </span>
            {INSTALL}
          </code>
          <CopyButton text={INSTALL} />
        </div>
      </section>
    </main>
  );
}
