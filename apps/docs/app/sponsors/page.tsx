import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

import {
  ArrowUpRightIcon,
  GitHubIcon,
  HeartIcon,
  PullRequestIcon,
  ShareIcon,
  StarIcon,
} from '../../components/icons';
import { LogoMark } from '../../components/logo';
import { byCategory, componentCount, screenCount } from '../../lib/data';
import { getSponsors, SPONSOR_URL } from '../../lib/sponsors';
import '../home.css';
import './sponsors.css';

export const metadata: Metadata = {
  title: 'Sponsors',
  description: 'Sponsor Kinetik UI and keep it free and open source for React Native developers.',
};

const REPO_URL = 'https://github.com/NURULLAHTURGUT/kinetikui';
const SHARE_URL = `https://x.com/intent/post?text=${encodeURIComponent(
  'Kinetik UI: free, open-source motion components for React Native and Expo. https://kinetik-ui.dev',
)}`;

const delay = (d: number) => ({ '--d': d }) as CSSProperties;

/** Splits a heading into words that blur and rise in one after another. */
function Words({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(' ');
  return words.map((word, i) => (
    <span key={i} className="word" style={{ '--w': start + i } as CSSProperties}>
      {word}
      {i < words.length - 1 ? ' ' : ''}
    </span>
  ));
}

export default async function SponsorsPage() {
  const sponsors = await getSponsors();
  // Open slots fill the row: three when there is no one yet, otherwise one more.
  const open = sponsors.length === 0 ? 3 : 1;
  const categories = byCategory().filter((g) => g.key !== 'screen').length;
  const stats = [
    { value: String(componentCount), label: 'Components' },
    { value: String(screenCount), label: 'Screen templates' },
    { value: String(categories), label: 'Categories' },
    { value: 'MIT', label: 'Free and open source' },
  ];
  const ways = [
    {
      icon: <StarIcon size={18} />,
      title: 'Star the repository',
      text: 'Stars help other developers find Kinetik UI on GitHub.',
      href: REPO_URL,
      action: 'Star on GitHub',
    },
    {
      icon: <ShareIcon size={18} />,
      title: 'Share it',
      text: 'Tell a friend or post the components you like most.',
      href: SHARE_URL,
      action: 'Share on X',
    },
    {
      icon: <PullRequestIcon size={18} />,
      title: 'Contribute a component',
      text: 'Built something that moves well? Once merged, anyone can add it with npm or MCP.',
      href: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
      action: 'Read the guide',
    },
  ];

  return (
    <main className="home sponsors">
      <section className="sponsor-hero" aria-labelledby="sponsor-title">
        <div className="sponsor-glow" aria-hidden />
        <div className="sponsor-mark" aria-hidden>
          <LogoMark width={1200} />
        </div>
        <a className="pill rise" style={delay(0)} href={SPONSOR_URL}>
          <span className="pill-dot" />
          {sponsors.length === 0 ? 'Become the first sponsor' : 'Become a sponsor'}
          <ArrowUpRightIcon size={14} className="pill-arrow" />
        </a>
        <h1 id="sponsor-title" className="words-in">
          <Words text="Keep Kinetik" />{' '}
          <span className="hero-second">
            <Words text="moving." start={2} />
          </span>
        </h1>
        <p className="hero-lede rise" style={delay(2)}>
          Kinetik UI is free and open source. Sponsorship pays for the time behind new components,
          fixes and the performance work that keeps every animation smooth.
        </p>
        <div className="hero-actions rise" style={delay(3)}>
          <a className="button button-primary" href={SPONSOR_URL}>
            <HeartIcon size={16} className="button-icon" />
            Sponsor on GitHub
          </a>
          <a className="button button-secondary" href={REPO_URL}>
            <GitHubIcon size={16} className="button-icon" />
            View the code
          </a>
        </div>
      </section>

      <section className="block sponsor-stats-block" aria-label="Kinetik UI at a glance">
        <ul className="sponsor-stats" data-reveal>
          {stats.map((s, i) => (
            <li key={s.label} style={delay(i)}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-labelledby="wall-title">
        <header className="block-head sponsor-head" data-reveal>
          <h2 id="wall-title">
            <Words text="Sponsors" />
          </h2>
          <p>Every public sponsor shows up here automatically.</p>
        </header>
        <div className="sponsor-slots">
          {sponsors.map((s, i) => (
            <a
              key={s.login}
              className="sponsor-card spot"
              href={s.url}
              data-reveal
              style={delay(i)}
            >
              {/* GitHub serves the avatar at the requested size. */}
              <img src={s.avatar} alt="" width={48} height={48} loading="lazy" />
              <span className="sponsor-card-name">{s.name}</span>
              <span className="sponsor-card-login">@{s.login}</span>
            </a>
          ))}
          {Array.from({ length: open }, (_, i) => (
            <a
              key={`open-${i}`}
              className="sponsor-slot spot"
              href={SPONSOR_URL}
              data-reveal
              style={delay(sponsors.length + i)}
              aria-label="Become a sponsor"
            >
              <span className="sponsor-slot-plus" aria-hidden>
                +
              </span>
              <span>
                {sponsors.length === 0 && i === 0 ? 'Be the first sponsor' : 'Your name here'}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="block" aria-labelledby="ways-title">
        <header className="block-head sponsor-head" data-reveal>
          <h2 id="ways-title">
            <Words text="Other ways" />{' '}
            <span className="hero-second">
              <Words text="to help" start={2} />
            </span>
          </h2>
          <p>Not every kind of support is money.</p>
        </header>
        <ul className="sponsor-ways">
          {ways.map((w, i) => (
            <li key={w.title} className="sponsor-way spot" data-reveal style={delay(i)}>
              <span className="sponsor-way-icon">{w.icon}</span>
              <h3>{w.title}</h3>
              <p>{w.text}</p>
              <a href={w.href}>
                {w.action}
                <ArrowUpRightIcon size={14} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="cta" aria-labelledby="sponsor-cta" data-reveal>
        <div className="cta-glow" aria-hidden />
        <div className="cta-mark" aria-hidden>
          <LogoMark width={1200} />
        </div>
        <h2 id="sponsor-cta">
          <Words text="Thank you" />{' '}
          <span className="hero-second">
            <Words text="for the support." start={2} />
          </span>
        </h2>
        <p>Monthly or one-time, every sponsorship helps.</p>
        <a className="button button-primary" href={SPONSOR_URL}>
          <HeartIcon size={16} className="button-icon" />
          Sponsor on GitHub
        </a>
      </section>
    </main>
  );
}
