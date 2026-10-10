import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import '../generated/tokens.css';
import './globals.css';
import { ThemeSync, ThemeToggle, themeBootScript } from '../components/theme';
import { SITE } from '../lib/data';

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  alternates: { types: { 'text/markdown': '/index.md', 'text/plain': '/llms.txt' } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0D12' },
    { media: '(prefers-color-scheme: light)', color: '#F6F5F2' },
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
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
              <span className="brand-dot" aria-hidden />
              Kinetik
            </Link>
            <nav aria-label="Primary" className="topnav">
              <Link href="/#components">Components</Link>
              <Link href="/docs/getting-started">Getting started</Link>
            </nav>
            <ThemeToggle />
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="footer">
          <div className="footer-inner">
            <span>Kinetik UI · MIT</span>
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
