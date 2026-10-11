import type { Controls } from '@kinetik/registry/demo-kit/types';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { CopyButton } from '../components/copy-button';
import { KineticField } from '../components/kinetic-field';
import { LogoMark } from '../components/logo';
import { ShowcasePreview } from '../components/showcase';
import { Terminal } from '../components/terminal';
import './home.css';
import { allComponents, componentCount, byCategory, getComponent, screenCount } from '../lib/data';

const CATEGORY_TITLE: Record<string, string> = {
  background: 'Backgrounds',
  card: 'Cards',
  interaction: 'Interaction',
  text: 'Text',
  navigation: 'Navigation',
  feedback: 'Feedback',
  screen: 'Screen templates',
};

/** Landing showcase: a large tile, two beside it, then a small and a wide one. */
const FEATURED = ['glint-card', 'liquid-tabs', 'odometer', 'press-jelly', 'aurora-veil'] as const;

const INSTALL = 'npx kinetik-ui add glint-card';

/** Stagger index for entrance animations (read by CSS as --d). */
const delay = (d: number) => ({ '--d': d }) as CSSProperties;

/** Splits a heading into words that blur and rise in one after another. */
function Words({ text, start = 0 }: { text: string; start?: number }) {
  return text.split(' ').map((word, i) => (
    <span key={i} className="word" style={{ '--w': start + i } as CSSProperties}>
      {word}
      {i < text.split(' ').length - 1 ? ' ' : ''}
    </span>
  ));
}

function ArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="button-icon">
      <path
        d="M8 2.5v11M3.5 9 8 13.5 12.5 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
              <ArrowDown />
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
                  →
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
          <p>Native motion primitives, your own source files, and the details done for you.</p>
        </header>
        <div className="principles">
          <article className="principle spot" data-reveal style={delay(0)}>
            <div className="art art-thread" aria-hidden>
              <span className="lane lane-js">
                <i />
                <i />
                <i />
              </span>
              <span className="lane lane-ui">
                <i />
              </span>
            </div>
            <h3>On the UI thread</h3>
            <p>
              Gestures, springs and shaders run as worklets, so a busy JavaScript thread never
              stalls the animation.
            </p>
          </article>
          <article className="principle spot" data-reveal style={delay(1)}>
            <div className="art art-files" aria-hidden>
              <span>components/</span>
              <span>└ kinetik/</span>
              <span className="file-new">&nbsp;&nbsp;└ glint-card.tsx</span>
            </div>
            <h3>Copied, not installed</h3>
            <p>
              The CLI writes TypeScript source into your project. You own the code and can change
              anything.
            </p>
          </article>
          <article className="principle spot" data-reveal style={delay(2)}>
            <div className="art art-motion" aria-hidden>
              <span className="ball" />
              <span className="switch-art" />
            </div>
            <h3>Accessible by default</h3>
            <p>
              Every component has a reduced-motion version, screen-reader labels and roles, and 44
              pt touch targets.
            </p>
          </article>
          <article className="principle spot" data-reveal style={delay(3)}>
            <div className="art art-theme" aria-hidden>
              <span className="swatch" />
              <code>{"colors={{ ember: '#7C5CFF' }}"}</code>
            </div>
            <h3>One design language</h3>
            <p>
              Colours, spacing, type and three springs come from shared tokens. Brand everything
              with one provider.
            </p>
          </article>
        </div>
      </section>

      <section className="block how" aria-labelledby="how-title">
        <div className="how-copy" data-reveal>
          <span className="overline">How it works</span>
          <h2 id="how-title">
            <Words text="Two commands to motion." />
          </h2>
          <ol className="steps">
            <li>
              <strong>Init</strong>
              <span>Adds the shared tokens and motion presets, and installs Reanimated.</span>
            </li>
            <li>
              <strong>Add</strong>
              <span>
                Copies the components you pick and installs their native dependencies with{' '}
                <code>expo install</code>, so versions always match your SDK.
              </span>
            </li>
            <li>
              <strong>Make it yours</strong>
              <span>It is your code now. Restyle it, rename it, ship it.</span>
            </li>
          </ol>
          <Link className="button button-secondary" href="/docs/getting-started">
            Read the guide
          </Link>
        </div>
        <div data-reveal style={delay(1)}>
          <Terminal />
        </div>
      </section>

      <section className="block" id="components" aria-labelledby="components-title">
        <header className="block-head" data-reveal>
          <span className="overline">Catalogue</span>
          <h2 id="components-title">
            <Words text="Seven kinds of motion." />
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
              href={`/components/${group.items[0]!.name}`}
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
                  →
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
