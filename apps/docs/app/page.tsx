import Link from 'next/link';

import { CopyButton } from '../components/copy-button';
import { componentCount, byCategory, SITE, screenCount } from '../lib/data';

const CATEGORY_TITLE: Record<string, string> = {
  background: 'Backgrounds',
  card: 'Cards',
  interaction: 'Interaction',
  text: 'Text',
  navigation: 'Navigation',
  feedback: 'Feedback',
  screen: 'Screen templates',
};

export default function Home() {
  const install = 'npx kinetik-ui add glint-card';
  return (
    <main>
      <section className="hero">
        <span className="overline">Expo · Reanimated 4 · Skia</span>
        <h1>
          Motion parts <em>for Expo.</em>
        </h1>
        <p>{SITE.description}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="#components">
            Browse {componentCount} components
          </Link>
          <Link className="button button-ghost" href="/docs/getting-started">
            Getting started
          </Link>
        </div>
        <div className="command">
          <code>
            <span className="prompt">$ </span>
            {install}
          </code>
          <CopyButton text={install} />
        </div>
      </section>

      <section className="features" aria-label="Why Kinetik">
        <div className="feature">
          <h3>On the UI thread</h3>
          <p>Gestures, springs and shaders run as worklets. Busy JavaScript never drops a frame.</p>
        </div>
        <div className="feature">
          <h3>Copied, not installed</h3>
          <p>
            The CLI copies the source into your app and installs SDK-matched dependencies. You own
            the code.
          </p>
        </div>
        <div className="feature">
          <h3>Accessible by default</h3>
          <p>
            Every component has a reduced-motion version, screen-reader labels and 44 pt touch
            targets.
          </p>
        </div>
      </section>

      <section className="catalog" id="components" aria-labelledby="components-title">
        <div className="catalog-head">
          <h2 id="components-title">Components</h2>
          <span className="muted">
            {componentCount} components · {screenCount} screens
          </span>
        </div>
        {byCategory().map((group) => (
          <div className="group" key={group.key}>
            <div className="overline">
              <span>{CATEGORY_TITLE[group.key]}</span>
              <span>{group.items.length}</span>
            </div>
            <div className="cards">
              {group.items.map((c) => (
                <Link key={c.name} href={`/components/${c.name}`} className="card">
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                  <div className="tags">
                    {c.dependencies.includes('@shopify/react-native-skia') && (
                      <span className="tag tag-ice">Skia</span>
                    )}
                    {c.dependencies.includes('react-native-gesture-handler') && (
                      <span className="tag">Gesture</span>
                    )}
                    {c.web === 'device-only' && <span className="tag tag-ember">Device only</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
