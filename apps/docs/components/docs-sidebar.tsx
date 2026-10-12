import Link from 'next/link';

import { byCategory } from '../lib/data';
import { DocsNav } from './docs-nav';

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
    <DocsNav>
      <div className="docs-nav-inner">
        <div className="docs-nav-group">
          <span className="docs-nav-title">Get started</span>
          <ul>
            {link('/docs/getting-started', 'Introduction')}
            {link('/registry', 'Registry')}
          </ul>
        </div>
        {byCategory().map((g) => (
          <div className="docs-nav-group" key={g.key}>
            <span className="docs-nav-title">{g.items[0]?.categoryTitle}</span>
            <ul>{g.items.map((item) => link(`/components/${item.name}`, item.title))}</ul>
          </div>
        ))}
      </div>
    </DocsNav>
  );
}
