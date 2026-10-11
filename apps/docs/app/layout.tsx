import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '../generated/tokens.css';
import './globals.css';
import { Effects } from '../components/effects';
import { GitHubLink } from '../components/github-link';
import { LogoMark } from '../components/logo';
import { ThemeSync, ThemeToggle, themeBootScript } from '../components/theme';
import { navOrder, SITE } from '../lib/data';

/** "Components" opens the first component's page. */
const componentsHref = `/components/${navOrder()[0]?.name ?? ''}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://kinetik-ui.dev'),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  alternates: { types: { 'text/markdown': '/index.md', 'text/plain': '/llms.txt' } },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: 'https://kinetik-ui.dev',
    siteName: SITE.name,
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeSync />
        <Effects />
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
              <LogoMark width={40} className="brand-logo" />
              <span>
                Kinetik <span className="brand-sub">UI</span>
              </span>
            </Link>
            <nav aria-label="Primary" className="topnav">
              <Link href={componentsHref}>Components</Link>
              <Link href="/docs/getting-started">Docs</Link>
            </nav>
            <div className="topbar-end">
              <GitHubLink />
              <span className="topbar-divider" aria-hidden />
              <ThemeToggle />
              <span className="topbar-divider" aria-hidden />
              <a className="built-by" href="https://github.com/NURULLAHTURGUT">
                Built by <span>@NURULLAHTURGUT</span>
              </a>
            </div>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
                <LogoMark width={40} className="brand-logo" />
                <span>
                  Kinetik <span className="brand-sub">UI</span>
                </span>
              </Link>
              <p className="muted">{SITE.tagline} MIT licensed.</p>
            </div>
            <nav className="footer-links" aria-label="Footer">
              <div>
                <span className="overline">Library</span>
                <Link href={componentsHref}>Components</Link>
                <Link href="/docs/getting-started">Getting started</Link>
              </div>
              <div>
                <span className="overline">Resources</span>
                <a href="https://www.npmjs.com/package/kinetik-ui">npm</a>
                <a href="/llms.txt">llms.txt</a>
                <a href="/r/registry.json">Registry</a>
              </div>
            </nav>
          </div>
          <div className="footer-fine">
            <span className="muted">
              Requires the React Native New Architecture (Reanimated 4).
            </span>
            <span className="muted">
              Live previews run on{' '}
              <a href="/canvaskit-LICENSE.txt">CanvasKit (Skia), © Google, BSD-3-Clause</a>.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
