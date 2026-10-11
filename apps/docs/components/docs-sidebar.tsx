import Link from 'next/link';

import { byCategory } from '../lib/data';

/** The docs navigation: guides first, then every component by category. */
export function DocsSidebar({ current }: { current: string }) {
  const link = (href: string, label: string) => (
    <li key={href}>
      <Link href={href} aria-current={href === current ? 'page' : undefined}>
        {label}
      </Link>
    </li>
  );
  return (
    <nav className="docs-nav" aria-label="Documentation">
      <div className="docs-nav-inner">
        <div className="docs-nav-group">
          <span className="docs-nav-title">Get started</span>
          <ul>{link('/docs/getting-started', 'Introduction')}</ul>
        </div>
        {byCategory().map((g) => (
          <div className="docs-nav-group" key={g.key}>
            <span className="docs-nav-title">{g.items[0]?.categoryTitle}</span>
            <ul>{g.items.map((item) => link(`/components/${item.name}`, item.title))}</ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
